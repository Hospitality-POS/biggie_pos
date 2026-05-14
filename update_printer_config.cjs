// Script to update printer configuration to use IP 192.168.100.89
const fs = require('fs');
const path = require('path');

// Configuration update
const printerConfig = {
  printer_name: "Thermal Printer (192.168.100.89)",
  printer_type: "thermal",
  connection_type: "ip",
  ip_address: "192.168.100.89",
  port: 9100,
  paper_width: 80,
  characters_per_line: 32,
  line_spacing: 48,
  is_default: true,
  is_active: true,
  timeout_ms: 5000,
  retry_attempts: 3
};

// Get shop and tenant info from localStorage simulation
const getShopId = () => {
  try {
    // Try to read from a local config file or use default
    const configPath = path.join(__dirname, '.env');
    if (fs.existsSync(configPath)) {
      const envContent = fs.readFileSync(configPath, 'utf8');
      const shopMatch = envContent.match(/VITE_SHOP_ID=(.+)/);
      return shopMatch ? shopMatch[1] : 'default-shop';
    }
    return 'default-shop';
  } catch (error) {
    console.log('Using default shop ID');
    return 'default-shop';
  }
};

const getTenantCode = () => {
  try {
    const configPath = path.join(__dirname, '.env');
    if (fs.existsSync(configPath)) {
      const envContent = fs.readFileSync(configPath, 'utf8');
      const tenantMatch = envContent.match(/VITE_TENANT_CODE=(.+)/);
      return tenantMatch ? tenantMatch[1] : 'default-tenant';
    }
    return 'default-tenant';
  } catch (error) {
    console.log('Using default tenant code');
    return 'default-tenant';
  }
};

// Update printer configuration via API
async function updatePrinterConfig() {
  const shopId = getShopId();
  const tenantCode = getTenantCode();
  
  console.log('🔧 Updating printer configuration...');
  console.log(`📍 Shop ID: ${shopId}`);
  console.log(`🏢 Tenant Code: ${tenantCode}`);
  console.log(`🖨️  New IP Address: ${printerConfig.ip_address}`);
  
  try {
    const response = await fetch(`http://localhost:3002/printer-service/config?shop_id=${shopId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'companycode': tenantCode
      },
      body: JSON.stringify(printerConfig)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}: ${errorData.message || response.statusText}`);
    }
    
    const result = await response.json();
    console.log('✅ Printer configuration updated successfully!');
    console.log('📋 Configuration details:', result);
    
    return result;
  } catch (error) {
    console.error('❌ Failed to update printer configuration:', error.message);
    
    // Try alternative endpoint
    console.log('🔄 Trying alternative endpoint...');
    try {
      const altResponse = await fetch(`http://localhost:3002/printer-service/save-config?shop_id=${shopId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'companycode': tenantCode
        },
        body: JSON.stringify(printerConfig)
      });
      
      if (altResponse.ok) {
        const altResult = await altResponse.json();
        console.log('✅ Printer configuration updated via alternative endpoint!');
        console.log('📋 Configuration details:', altResult);
        return altResult;
      }
    } catch (altError) {
      console.error('❌ Alternative endpoint also failed:', altError.message);
    }
    
    throw error;
  }
}

// Test connection after update
async function testConnection() {
  console.log('🔗 Testing printer connection...');
  
  try {
    const response = await fetch(`http://localhost:3002/printer-service/test-connection`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ip_address: printerConfig.ip_address,
        port: printerConfig.port
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Printer connection test successful!');
      console.log(`🖨️  Connected to ${printerConfig.ip_address}:${printerConfig.port}`);
    } else {
      console.log('❌ Printer connection test failed:', result.message);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Connection test error:', error.message);
    return { success: false, message: error.message };
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting printer configuration update...');
  console.log('=====================================');
  
  try {
    // Update configuration
    await updatePrinterConfig();
    
    // Test connection
    await testConnection();
    
    console.log('=====================================');
    console.log('🎉 Printer configuration update completed!');
    console.log('📝 You can now try printing with the new IP address.');
    
  } catch (error) {
    console.error('💥 Update failed:', error.message);
    console.log('💡 Please check:');
    console.log('   1. Printer service is running on localhost:3002');
    console.log('   2. Network connectivity to 192.168.100.89');
    console.log('   3. Printer is powered on and connected');
    
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  updatePrinterConfig,
  testConnection,
  printerConfig
};
