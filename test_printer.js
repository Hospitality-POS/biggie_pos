// Simple test script to check printer service and update configuration
const testPrinterService = async () => {
  console.log('🔍 Testing printer service...');
  
  try {
    // Test basic connection to printer service
    const response = await fetch('http://localhost:3002/printer-service/health');
    console.log('✅ Printer service is running');
    return true;
  } catch (error) {
    console.log('❌ Printer service not responding:', error.message);
    
    // Try alternative endpoints
    const endpoints = [
      'http://localhost:3002/printer-service/',
      'http://localhost:3002/printer-service/status',
      'http://localhost:3002/printer-service/test'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint);
        console.log(`✅ Found working endpoint: ${endpoint}`);
        return true;
      } catch (e) {
        console.log(`❌ ${endpoint} not working`);
      }
    }
    
    console.log('💡 Please start the printer service on port 3002');
    return false;
  }
};

const updateConfigDirectly = async () => {
  const shopId = localStorage.getItem('shopId') || 'default-shop';
  const tenantCode = JSON.parse(localStorage.getItem('tenant') || '{}')?.tenant_code || 'default-tenant';
  
  const config = {
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
  
  console.log('🔧 Updating printer configuration to:', config.ip_address);
  
  try {
    const response = await fetch(`http://localhost:3002/printer-service/config?shop_id=${shopId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'companycode': tenantCode
      },
      body: JSON.stringify(config)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Configuration updated:', result);
      return true;
    } else {
      console.log('❌ Failed to update config:', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ Error updating config:', error.message);
    return false;
  }
};

// Run tests
testPrinterService().then(isRunning => {
  if (isRunning) {
    updateConfigDirectly();
  }
});
