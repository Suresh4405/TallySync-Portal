const axios = require('axios');
const SyncLog = require('../models/SyncLog');
const TallyLedger = require('../models/TallyLedger');
const { Company } = require('../models');

class TallyService {
  constructor() {
    this.tallyHost = process.env.TALLY_HOST || 'http://localhost:9000';
    this.companyName = process.env.TALLY_COMPANY_NAME || 'DevCompany';
    this.salesAccountName = process.env.TALLY_SALES_ACCOUNT || 'Sales'; 
  }

  async createSyncLog(syncType, userId) {
    const syncLog = await SyncLog.create({
      sync_type: syncType,
      user_id: userId,
      status: 'in_progress'
    });
    return syncLog.id;
  }

  async updateSyncLog(logId, data) {
    await SyncLog.update(data, {
      where: { id: logId }
    });
  }

  async sendRequestToTally(xmlData) {
    try {
      
      const response = await axios.post(this.tallyHost, xmlData, {
        headers: {
          'Content-Type': 'application/xml',
          'Accept': 'application/xml'
        },
        timeout: 30000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });
      
      return response.data;
      
    } catch (error) {
    
      
      if (error.code === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to Tally at ${this.tallyHost}. Make sure:
        1. Tally is running
        2. ODBC is enabled (F11 → F1 → Enable ODBC)
        3. Tally is listening on port 9000`);
      }
      
      throw error;
    }
  }

  async testTallyConnection() {
    try {
      const testXml = `<?xml version="1.0"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export</TALLYREQUEST>
  </HEADER>
  <BODY>
    <DESC>
      <STATICVARIABLES>
        <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
      </STATICVARIABLES>
    </DESC>
  </BODY>
</ENVELOPE>`;

      const response = await axios.post(this.tallyHost, testXml, {
        headers: { 'Content-Type': 'application/xml' },
        timeout: 5000
      });

      return !!(response && response.data);
      
    } catch (error) {
      console.error('tally connection test not came', error.message);
      return false;
    }
  }

  async createLedgerInTally(ledgerData, userId) {
    const syncLogId = await this.createSyncLog('tally_ledger', userId);

    try {
        const isConnected = await this.testTallyConnection();
        if (!isConnected) {
            throw new Error('Cannot connect to Tally. Please check Tally is running.');
        }

        const parentGroup = ledgerData.parent_group || 'Sundry Debtors';
        
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${this.escapeXml(this.companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <LEDGER NAME="${this.escapeXml(ledgerData.ledger_name)}">
            <NAME>${this.escapeXml(ledgerData.ledger_name)}</NAME>
            <PARENT>${this.escapeXml(parentGroup)}</PARENT>
            <ISBILLWISEON>Yes</ISBILLWISEON>
            <OPENINGBALANCE>${this.formatAmount(ledgerData.opening_balance || 0)}</OPENINGBALANCE>
            <OPENINGBALANCETYPE>${(ledgerData.opening_balance || 0) >= 0 ? 'Dr' : 'Cr'}</OPENINGBALANCETYPE>
            
            <!-- Address Section -->
            ${ledgerData.address ? `
            <ADDRESS.LIST>
              <ADDRESS>${this.escapeXml(this.cleanAddress(ledgerData.address))}</ADDRESS>
            </ADDRESS.LIST>` : ''}
            
            <!-- State - Try different field names -->
            ${ledgerData.state ? `
            <STATENAME>${this.escapeXml(ledgerData.state)}</STATENAME>
            <STATE>${this.escapeXml(ledgerData.state)}</STATE>` : ''}
            
            <!-- Country - Tally might not have a separate country field -->
            ${ledgerData.country ? `
            <COUNTRYNAME>${this.escapeXml(ledgerData.country)}</COUNTRYNAME>
            <COUNTRY>${this.escapeXml(ledgerData.country)}</COUNTRY>` : ''}
            
            ${ledgerData.pincode ? `<PINCODE>${this.escapeXml(ledgerData.pincode)}</PINCODE>` : ''}
            
            <!-- Contact Information -->
            ${ledgerData.mobile ? `
            <CONTACTDETAILS.LIST>
              <CONTACTNUMBER>${this.escapeXml(ledgerData.mobile)}</CONTACTNUMBER>
              <CONTACTTYPE>Mobile</CONTACTTYPE>
            </CONTACTDETAILS.LIST>` : ''}
            
            ${ledgerData.email ? `
            <EMAILDETAILS.LIST>
              <EMAILID>${this.escapeXml(ledgerData.email)}</EMAILID>
              <EMAILTYPE>Primary</EMAILTYPE>
            </EMAILDETAILS.LIST>` : ''}
            
            <!-- Tax Information -->
            ${ledgerData.gst_number ? `
            <GSTDETAILS.LIST>
              <APPLICABLEFROM>01-Apr-2017</APPLICABLEFROM>
              <GSTREGISTRATIONTYPE>Regular</GSTREGISTRATIONTYPE>
              <GSTNUMBER>${this.escapeXml(ledgerData.gst_number)}</GSTNUMBER>
            </GSTDETAILS.LIST>` : ''}
            
            ${ledgerData.pan_number ? `
            <TAXREGISTEREDDETAILS.LIST>
              <REGISTRATIONTYPE>Income Tax</REGISTRATIONTYPE>
              <REGISTRATIONNUMBER>${this.escapeXml(ledgerData.pan_number)}</REGISTRATIONNUMBER>
            </TAXREGISTEREDDETAILS.LIST>` : ''}
            
            <!-- Alternative: Use INCOMETAXNUMBER directly -->
            ${ledgerData.pan_number ? `<INCOMETAXNUMBER>${this.escapeXml(ledgerData.pan_number)}</INCOMETAXNUMBER>` : ''}
            
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;


        const response = await this.sendRequestToTally(xml);
        const result = await this.parseTallyResponse(response);
        
        if (result.success) {
            await this.updateSyncLog(syncLogId, {
                status: 'success',
                end_time: new Date(),
                records_processed: 1
            });

            return {
                success: true,
                tallyGuid: ledgerData.ledger_name,
                message: 'Ledger created successfully in Tally'
            };
        } else {
            throw new Error(result.error || 'Tally returned an error');
        }

    } catch (error) {
        console.error('Ledger creation error:', error);
        await this.updateSyncLog(syncLogId, {
            status: 'failed',
            end_time: new Date(),
            error_message: error.message
        });

        return {
            success: false,
            message: `Failed to create ledger: ${error.message}`
        };
    }
}
async deleteLedgerFromTally(ledgerName) {
    try {
        console.log(`Attempting to delete ledger "${ledgerName}" from Tally...`);

        const xml = `<?xml version="1.0"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${this.escapeXml(this.companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <LEDGER NAME="${this.escapeXml(ledgerName)}" ACTION="Delete">
            <NAME>${this.escapeXml(ledgerName)}</NAME>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

        const response = await axios.post(this.tallyHost, xml, {
            headers: {
                'Content-Type': 'application/xml',
                'Accept': 'application/xml'
            },
            timeout: 30000
        });

        console.log('Tally Response:', response.data);
        if (response.data.includes('<DELETED>1</DELETED>')) {
            return { 
                success: true, 
                message: 'Ledger deleted successfully from Tally' 
            };
        } 
        else if (response.data.includes('does not exist') || 
                 response.data.includes('not found') ||
                 response.data.includes('LINEERROR')) {
            console.log(`Ledger "${ledgerName}" doesn't exist in Tally (already deleted or never existed)`);
            return { 
                success: true, 
                message: 'Ledger does not exist in Tally (nothing to delete)' 
            };
        }
        else {
            throw new Error('Tally returned unexpected response');
        }

    } catch (error) {
        console.error('Delete ledger from Tally error:', error.message);
        
        if (error.message.includes('does not exist') || 
            error.message.includes('not found') ||
            (error.response && error.response.data && 
             (error.response.data.includes('does not exist') || 
              error.response.data.includes('not found')))) {
            return { 
                success: true, 
                message: 'Ledger does not exist in Tally (nothing to delete)' 
            };
        }
        
        if (error.response) {
            throw new Error(`Tally returned ${error.response.status}: ${error.response.data}`);
        } else if (error.request) {
            throw new Error('No response received from Tally');
        } else {
            throw error;
        }
    }
}

async pushInvoiceToTally(invoiceData, userId) {
    const syncLogId = await this.createSyncLog('tally_invoice', userId);

    try {
        const isConnected = await this.testTallyConnection();
        if (!isConnected) {
            throw new Error('Cannot connect to Tally. Please check Tally is running.');
        }

        const voucherNumber = invoiceData.voucher_number || this.generateVoucherNumber();
        const date = invoiceData.date ? this.formatTallyDate(invoiceData.date) : this.formatTallyDate(new Date());
        
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Voucher</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${this.escapeXml(this.companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <VOUCHER REMOTEID="1" VCHTYPE="Sales" ACTION="Create" OBJVIEW="Accounting Voucher View">
            <DATE>${date}</DATE>
            <GUID>${voucherNumber}</GUID>
            <NARRATION>${this.escapeXml(invoiceData.narration || 'Sales Invoice')}</NARRATION>
            <VOUCHERTYPENAME>Sales</VOUCHERTYPENAME>
            <VOUCHERNUMBER>${voucherNumber}</VOUCHERNUMBER>
            <REFERENCE>${voucherNumber}</REFERENCE>
            <PARTYLEDGERNAME>${this.escapeXml(invoiceData.party_ledger_name)}</PARTYLEDGERNAME>
            <PERSISTEDVIEW>Accounting Voucher View</PERSISTEDVIEW>
            
            <!-- Party Entry (Debit) -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>${this.escapeXml(invoiceData.party_ledger_name)}</LEDGERNAME>
              <GSTCLASS/>
              <ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>Yes</ISPARTYLEDGER>
              <AMOUNT>${this.formatAmount(invoiceData.total_amount)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            
            <!-- Sales Entry (Credit) -->
            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Sales</LEDGERNAME>
              <GSTCLASS/>
              <ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE>
              <LEDGERFROMITEM>No</LEDGERFROMITEM>
              <REMOVEZEROENTRIES>No</REMOVEZEROENTRIES>
              <ISPARTYLEDGER>No</ISPARTYLEDGER>
              <AMOUNT>-${this.formatAmount(invoiceData.total_amount)}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
            
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;


        const response = await this.sendRequestToTally(xml);
        
        
        const fs = require('fs');
        fs.writeFileSync('tally_invoice_response.xml', response || 'No response');
        
        const result = await this.parseTallyResponse(response);
        
        if (result.success) {
            await this.updateSyncLog(syncLogId, {
                status: 'success',
                end_time: new Date(),
                records_processed: 1
            });

            return {
                success: true,
                tallyGuid: voucherNumber,
                message: 'Invoice created successfully in Tally'
            };
        } else {
            throw new Error(result.error || 'Tally returned an error');
        }

    } catch (error) {
        console.error('Invoice creation error:', error.message);
        
        await this.updateSyncLog(syncLogId, {
            status: 'failed',
            end_time: new Date(),
            error_message: error.message
        });

        return {
            success: false,
            message: `Failed to create invoice: ${error.message}`
        };
    }
}

async deleteInvoiceFromTally(voucherNumber) {
    try {

        const xml = `<?xml version="1.0"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Vouchers</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${this.escapeXml(this.companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <VOUCHER VCHTYPE="Sales" ACTION="Delete">
            <VOUCHERNUMBER>${this.escapeXml(voucherNumber)}</VOUCHERNUMBER>
          </VOUCHER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

      
        const response = await axios.post(this.tallyHost, xml, {
            headers: {
                'Content-Type': 'application/xml',
                'Accept': 'application/xml'
            },
            timeout: 30000
        });

        console.log('Tally Response:', response.data);
        
        const result = await this.parseTallyResponse(response.data);

        if (result.success) {
            return { 
                success: true, 
                message: 'Invoice deleted successfully from Tally' 
            };
        } else {
            if (result.error.includes('does not exist') || 
                result.error.includes('not found')) {
                return { 
                    success: true, 
                    message: 'Invoice does not exist in Tally (nothing to delete)' 
                };
            }
            throw new Error(result.error);
        }

    } catch (error) {
        console.error('Delete invoice from Tally error:', error.message);
        
        if (error.response) {
            throw new Error(`Tally returned ${error.response.status}: ${error.response.data}`);
        } else if (error.request) {
            throw new Error('No response received from Tally');
        } else {
            throw error;
        }
    }
}

 async parseTallyResponse(response) {
    try {
        
        if (!response) {
            return { success: false, error: 'Empty response from Tally' };
        }

        const responseStr = typeof response === 'string' ? response : response.toString();
  
        
        const fs = require('fs');
        fs.writeFileSync('tally_parse_debug.xml', responseStr);
        
        if (responseStr.includes('<CREATED>1</CREATED>') ||
            responseStr.includes('<ALTERED>1</ALTERED>') ||
            responseStr.includes('<DELETED>1</DELETED>') ||
            responseStr.includes('<LASTVCHID>') ||
            responseStr.includes('VOUCHER')) {  
            return { success: true };
        }
        
        if (responseStr.includes('LINEERROR')) {
            const errorMatch = responseStr.match(/<LINEERROR>([\s\S]*?)<\/LINEERROR>/);
            const error = errorMatch ? errorMatch[1].trim() : 'TDL Line error';
            return { success: false, error };
        }
        
        if (responseStr.includes('<ERROR>')) {
            const errorMatch = responseStr.match(/<ERROR>([\s\S]*?)<\/ERROR>/);
            const error = errorMatch ? errorMatch[1].trim() : 'Tally error';
            return { success: false, error };
        }
        
        if (responseStr.length < 50) {
            return { success: false, error: 'Invalid Tally response' };
        }
        
        return { success: false, error: 'Unknown Tally response' };
        
    } catch (error) {
        console.error('Error parsing Tally response:', error);
        return { success: false, error: 'Failed to parse Tally response' };
    }
}
async findSalesAccount() {
    try {
        const xml = `<?xml version="1.0"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>List of Groups</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${this.escapeXml(this.companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;

        const response = await this.sendRequestToTally(xml);
                
        const possibleSalesAccounts = [
            'Sales',
            'Sales Account',
            'Sales - Domestic',
            'Sales Income',
            'Direct Income',
            'Sales Ledger',
            'Sales A/c'
        ];
        
        for (const accountName of possibleSalesAccounts) {
            try {
                const checkXml = `<?xml version="1.0"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Ledger</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${this.escapeXml(this.companyName)}</SVCURRENTCOMPANY>
          <SVFROMNAME>${this.escapeXml(accountName)}</SVFROMNAME>
          <SVTONAME>${this.escapeXml(accountName)}</SVTONAME>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;
                
                const checkResponse = await axios.post(this.tallyHost, checkXml, {
                    headers: { 'Content-Type': 'application/xml' },
                    timeout: 5000
                });
                
                if (checkResponse.data.includes(`<LEDGERNAME>${accountName}</LEDGERNAME>`)) {
                    // console.log(` sales account: "${accountName}"`);
                    return accountName;
                }
            } catch (error) {
                continue;
            }
        }
        
        // console.log('No sales account found fond');
        return 'Sales';
        
    } catch (error) {
        console.error('Error finding sales account:', error);
        return 'Sales';
    }
}
async createSalesLedgerIfNotExists() {
    try {
        
        const salesLedgerXml = `<?xml version="1.0"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Import Data</TALLYREQUEST>
  </HEADER>
  <BODY>
    <IMPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>All Masters</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${this.escapeXml(this.companyName)}</SVCURRENTCOMPANY>
        </STATICVARIABLES>
      </REQUESTDESC>
      <REQUESTDATA>
        <TALLYMESSAGE>
          <LEDGER NAME="Sales">
            <NAME>Sales</NAME>
            <PARENT>Sales Accounts</PARENT>
          </LEDGER>
        </TALLYMESSAGE>
      </REQUESTDATA>
    </IMPORTDATA>
  </BODY>
</ENVELOPE>`;

        const response = await this.sendRequestToTally(salesLedgerXml);
        const result = await this.parseTallyResponse(response);
        
        if (result.success) {
            return true;
        } else {
            return false;
        }
        
    } catch (error) {
        console.error('Error creating sales ledger:', error);
        return false;
    }
}
  async getLedgersFromTally() {
    try {
        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ENVELOPE>
    <HEADER>
        <TALLYREQUEST>Export Data</TALLYREQUEST>
        <TYPE>Collection</TYPE>
        <ID>List of Accounts</ID>
    </HEADER>
    <BODY>
        <DESC>
            <STATICVARIABLES>
                <EXPLODEFLAG>Yes</EXPLODEFLAG>
                <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>
            </STATICVARIABLES>
            <TDL>
                <TDLMESSAGE>
                    <COLLECTION NAME="LedgerCollection">
                        <TYPE>Ledger</TYPE>
                        <FETCH>Name, Parent, OpeningBalance</FETCH>
                    </COLLECTION>
                </TDLMESSAGE>
            </TDL>
        </DESC>
    </BODY>
</ENVELOPE>`;

        const response = await this.sendRequestToTally(xml);
        
        
        if (response && typeof response === 'string') {
            
            const fs = require('fs');
            fs.writeFileSync('tally_response.xml', response);
        }
        
        const ledgers = [];
        if (response && typeof response === 'string') {
            const ledgerPattern = /<LEDGER[^>]*>[\s\S]*?<NAME>([^<]+)<\/NAME>[\s\S]*?<\/LEDGER>/gi;
            let match;
            
            while ((match = ledgerPattern.exec(response)) !== null) {
                ledgers.push({
                    name: match[1].trim(),
                    guid: match[1].trim(),
                    parent: 'Sundry Debtors',
                    opening_balance: 0,
                    closing_balance: 0,
                    is_active: true
                });
            }
            
            if (ledgers.length === 0) {
                const simplePattern = /<NAME>([^<]+)<\/NAME>/g;
                let simpleMatch;
                
                while ((simpleMatch = simplePattern.exec(response)) !== null) {
                    const name = simpleMatch[1].trim();
                    if (name && !name.includes('Tally') && !name.includes('Profit') && 
                        !name.includes('Loss') && name.length > 1) {
                        ledgers.push({
                            name: name,
                            guid: name,
                            parent: 'Sundry Debtors',
                            opening_balance: 0,
                            closing_balance: 0,
                            is_active: true
                        });
                    }
                }
            }
        }
        
        return ledgers;
        
    } catch (error) {
        console.error('Error fetching ledgers from Tally:', error);
        return [];
    }
}
async safeDeleteLedgerFromTally(ledgerName) {
    const exists = await this.checkLedgerExistsInTally(ledgerName);
    
    if (!exists) {
        return { 
            success: true, 
            message: 'Ledger does not exist in Tally (nothing to delete)' 
        };
    }
    
    return await this.deleteLedgerFromTally(ledgerName);
}

async checkLedgerExistsInTally(ledgerName) {
    try {
        const xml = `<?xml version="1.0"?>
<ENVELOPE>
  <HEADER>
    <TALLYREQUEST>Export</TALLYREQUEST>
  </HEADER>
  <BODY>
    <EXPORTDATA>
      <REQUESTDESC>
        <REPORTNAME>Ledger</REPORTNAME>
        <STATICVARIABLES>
          <SVCURRENTCOMPANY>${this.escapeXml(this.companyName)}</SVCURRENTCOMPANY>
          <SVFROMNAME>${this.escapeXml(ledgerName)}</SVFROMNAME>
          <SVTONAME>${this.escapeXml(ledgerName)}</SVTONAME>
        </STATICVARIABLES>
      </REQUESTDESC>
    </EXPORTDATA>
  </BODY>
</ENVELOPE>`;

        const response = await axios.post(this.tallyHost, xml, {
            headers: { 'Content-Type': 'application/xml' },
            timeout: 10000
        });

        return response.data.includes(`<LEDGERNAME>${ledgerName}</LEDGERNAME>`) ||
               response.data.includes(ledgerName);

    } catch (error) {
        console.log(`Ledger "${ledgerName}" check error:`, error.message);
        return false;
    }
}

  async syncLedgersToDatabase(userId) {
    const syncLogId = await this.createSyncLog('manual', userId);
    let processed = 0;

    try {
      const tallyLedgers = await this.getLedgersFromTally();
      
      for (const tallyLedger of tallyLedgers) {
        const [ledger, created] = await TallyLedger.findOrCreate({
          where: { ledger_name: tallyLedger.name },
          defaults: {
            ledger_name: tallyLedger.name,
            parent_group: tallyLedger.parent,
            opening_balance: parseFloat(tallyLedger.opening_balance) || 0,
            closing_balance: parseFloat(tallyLedger.closing_balance) || 0,
            tally_guid: tallyLedger.guid,
            synced_at: new Date()
          }
        });

        if (!created) {
          await ledger.update({
            parent_group: tallyLedger.parent,
            closing_balance: parseFloat(tallyLedger.closing_balance) || 0,
            tally_guid: tallyLedger.guid,
            synced_at: new Date()
          });
        }

        processed++;
      }

      await this.updateSyncLog(syncLogId, {
        status: 'success',
        end_time: new Date(),
        records_processed: processed
      });

      return {
        success: true,
        message: `Successfully synced ${processed} ledgers from Tally`,
        count: processed
      };

    } catch (error) {
      await this.updateSyncLog(syncLogId, {
        status: 'failed',
        end_time: new Date(),
        error_message: error.message
      });

      return {
        success: false,
        message: `Failed to sync ledgers: ${error.message}`
      };
    }
  }

  formatAmount(amount) {
    const num = parseFloat(amount || 0);
    return num.toFixed(2);
  }

  formatTallyDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            throw new Error('Invalid date');
        }
        
        const day = date.getDate(); 
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        
        return `${day} ${month} ${year}`;
        
    } catch (error) {
        // console.error('Date formatting error:', error);
        const today = new Date();
        const day = today.getDate();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const month = months[today.getMonth()];
        const year = today.getFullYear();
        return `${day} ${month} ${year}`;
    }
}
  generateVoucherNumber() {
    const date = new Date();
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV${day}${month}${year}${random}`;
  }

escapeXml(unsafe) {
    if (!unsafe) return '';
    return unsafe.toString()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  cleanAddress(address) {
    if (!address) return '';
    return address
        .replace(/\r?\n|\r/g, ', ')  
        .replace(/\s+/g, ' ')        
        .replace(/, , /g, ', ')      
        .trim();
  }
  
}

module.exports = new TallyService();