# Product Variant System - Frontend Implementation Guide

## Overview

The product inventory system now supports variants, allowing you to track different colors, sizes, and other attributes for the same product. Each variant has its own quantity that contributes to the total product quantity. **All variant operations are tracked in cart and order processing.**

## Key Features

- **Toggle System**: Variants can be enabled/disabled per product
- **Flexible Attributes**: Support for any variant attributes (color, size, material, etc.)
- **Individual Tracking**: Each variant has its own quantity and SKU
- **Automatic Quantity Sync**: Total product quantity is calculated from variant quantities
- **Order Integration**: Variants are automatically deducted during sales
- **Cart Tracking**: Variants are tracked throughout the entire cart lifecycle
- **Low Stock Alerts**: Track low stock at variant level

## API Endpoints

### Variant Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | `/api/inventory/:id/variants/enable` | Enable variants for a product |
| PATCH | `/api/inventory/:id/variants/disable` | Disable variants for a product |
| POST | `/api/inventory/:id/variants` | Add a new variant |
| PUT | `/api/inventory/:id/variants/:variantId` | Update a variant |
| DELETE | `/api/inventory/:id/variants/:variantId` | Delete a variant |
| PATCH | `/api/inventory/:id/variants/:variantId/quantity` | Update variant quantity |
| GET | `/api/inventory/:id/variants` | Get product with variants |
| POST | `/api/inventory/:id/variants/find` | Find variant by attributes |
| GET | `/api/inventory/:id/variants/:variantId/availability` | Check variant availability |
| GET | `/api/inventory/variants/low-stock` | Get low stock variants |

## Data Structures

### Product with Variants

```json
{
  "_id": "product_id",
  "name": "Premium T-Shirt",
  "quantity": 200,
  "has_variants": true,
  "variants": [
    {
      "_id": "variant_id_1",
      "name": "Small-Red",
      "attributes": {
        "size": "S",
        "color": "Red"
      },
      "quantity": 50,
      "sku": "TSH-S-RED",
      "price": 29.99,
      "status": "active"
    },
    {
      "_id": "variant_id_2", 
      "name": "Medium-Red",
      "attributes": {
        "size": "M",
        "color": "Red"
      },
      "quantity": 75,
      "sku": "TSH-M-RED",
      "price": 29.99,
      "status": "active"
    }
  ]
}
```

### Cart Item with Variant

```json
{
  "_id": "cart_item_id",
  "item_type": "inventory",
  "item_id": "product_id",
  "variant_id": "variant_id_1",
  "variant_attributes": {
    "size": "S",
    "color": "Red"
  },
  "quantity": 2,
  "unit_price": 29.99,
  "description": "Premium T-Shirt (S, Red)",
  "tracked": true
}
```

### Order Item with Variant

```json
{
  "item_type": "inventory",
  "item_id": "product_id",
  "variant_id": "variant_id_1",
  "variant_attributes": {
    "size": "S",
    "color": "Red"
  },
  "quantity": 2,
  "unit_price": 29.99,
  "description": "Premium T-Shirt (S, Red)",
  "inventory_deducted": true
}
```

## Frontend Implementation Steps

### 1. Product Management UI

#### Enable/Disable Variants
```javascript
// Enable variants
const enableVariants = async (productId) => {
  try {
    const response = await fetch(`/api/inventory/${productId}/variants/enable`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  } catch (error) {
    console.error('Failed to enable variants:', error);
  }
};

// Disable variants
const disableVariants = async (productId) => {
  try {
    const response = await fetch(`/api/inventory/${productId}/variants/disable`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  } catch (error) {
    console.error('Failed to disable variants:', error);
  }
};
```

#### Add Variant
```javascript
const addVariant = async (productId, variantData) => {
  try {
    const response = await fetch(`/api/inventory/${productId}/variants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: variantData.name,
        attributes: variantData.attributes, // e.g., { size: "S", color: "Red" }
        quantity: variantData.quantity,
        sku: variantData.sku,
        price: variantData.price,
        status: 'active'
      })
    });
    return response.json();
  } catch (error) {
    console.error('Failed to add variant:', error);
  }
};
```

#### Update Variant
```javascript
const updateVariant = async (productId, variantId, variantData) => {
  try {
    const response = await fetch(`/api/inventory/${productId}/variants/${variantId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(variantData)
    });
    return response.json();
  } catch (error) {
    console.error('Failed to update variant:', error);
  }
};
```

#### Update Variant Quantity
```javascript
const updateVariantQuantity = async (productId, variantId, quantity) => {
  try {
    const response = await fetch(`/api/inventory/${productId}/variants/${variantId}/quantity`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity })
    });
    return response.json();
  } catch (error) {
    console.error('Failed to update variant quantity:', error);
  }
};
```

### 2. Product Selection UI

#### Display Variants in Product List
```javascript
const ProductCard = ({ product }) => {
  const showVariantInfo = () => {
    if (product.has_variants && product.variants) {
      const activeVariants = product.variants.filter(v => v.status === 'active');
      return (
        <div className="variant-info">
          <span className="variant-count">{activeVariants.length} variants</span>
          <span className="total-quantity">Total: {product.quantity}</span>
          {product.hasLowStockVariants && (
            <span className="low-stock-warning">⚠️ Low stock variants</span>
          )}
        </div>
      );
    }
    return <span className="quantity">Qty: {product.quantity}</span>;
  };

  return (
    <div className="product-card">
      <h3>{product.name}</h3>
      {showVariantInfo()}
    </div>
  );
};
```

#### Variant Selection Modal
```javascript
const VariantSelector = ({ product, onVariantSelect }) => {
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [availability, setAvailability] = useState(null);

  const checkAvailability = async (variantId, quantity) => {
    try {
      const response = await fetch(
        `/api/inventory/${product._id}/variants/${variantId}/availability?quantity=${quantity}` 
      );
      const data = await response.json();
      setAvailability(data);
    } catch (error) {
      console.error('Failed to check availability:', error);
    }
  };

  const handleVariantClick = (variant) => {
    setSelectedVariant(variant);
    checkAvailability(variant._id, 1);
  };

  const handleAddToCart = () => {
    if (selectedVariant && availability?.available) {
      onVariantSelect({
        item_type: 'inventory',
        item_id: product._id,
        variant_id: selectedVariant._id,
        variant_attributes: selectedVariant.attributes,
        quantity: 1,
        unit_price: selectedVariant.price || product.price,
        description: `${product.name} (${Object.entries(selectedVariant.attributes).map(([k, v]) => `${k}: ${v}`).join(', ')})`,
        tracked: true
      });
    }
  };

  return (
    <div className="variant-selector">
      <h3>Select Variant: {product.name}</h3>
      <div className="variant-grid">
        {product.variants
          .filter(v => v.status === 'active')
          .map(variant => (
            <div
              key={variant._id}
              className={`variant-card ${selectedVariant?._id === variant._id ? 'selected' : ''}`}
              onClick={() => handleVariantClick(variant)}
            >
              <h4>{variant.name}</h4>
              <div className="variant-attributes">
                {Object.entries(variant.attributes).map(([key, value]) => (
                  <span key={key} className="attribute">
                    {key}: {value}
                  </span>
                ))}
              </div>
              <div className="variant-details">
                <span className="quantity">Qty: {variant.quantity}</span>
                <span className="sku">SKU: {variant.sku}</span>
                <span className="price">${variant.price || product.price}</span>
              </div>
              {availability && selectedVariant?._id === variant._id && (
                <div className={`availability ${availability.available ? 'available' : 'unavailable'}`}>
                  {availability.available ? '✅ Available' : `❌ Only ${availability.availableQuantity} available`}
                </div>
              )}
            </div>
          ))}
      </div>
      <button
        className="add-to-cart-btn"
        onClick={handleAddToCart}
        disabled={!selectedVariant || !availability?.available}
      >
        Add to Cart
      </button>
    </div>
  );
};
```

### 3. Cart Management with Variant Tracking

#### Add to Cart with Variants
```javascript
const addToCart = async (cartItem) => {
  try {
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        item_type: cartItem.item_type,
        item_id: cartItem.item_id,
        variant_id: cartItem.variant_id,
        variant_attributes: cartItem.variant_attributes,
        quantity: cartItem.quantity,
        unit_price: cartItem.unit_price,
        description: cartItem.description,
        tracked: true
      })
    });
    
    const result = await response.json();
    
    // Update local cart state
    setCart(prev => [...prev, result.cartItem]);
    
    // Show success message with variant info
    const variantDesc = cartItem.variant_attributes 
      ? ` (${Object.entries(cartItem.variant_attributes).map(([k, v]) => `${k}: ${v}`).join(', ')})`
      : '';
    showToast(`Added ${cartItem.description}${variantDesc} to cart`, 'success');
    
    return result;
  } catch (error) {
    console.error('Failed to add to cart:', error);
    showToast('Failed to add item to cart', 'error');
  }
};
```

#### Cart Item Display with Variant Info
```javascript
const CartItem = ({ item, onQuantityChange, onRemove }) => {
  const displayVariantInfo = () => {
    if (item.variant_attributes) {
      return (
        <div className="variant-attributes">
          {Object.entries(item.variant_attributes).map(([key, value]) => (
            <span key={key} className="attribute-badge">
              {key}: {value}
            </span>
          ))}
        </div>
      );
    }
    return null;
  };

  const handleQuantityChange = async (newQuantity) => {
    try {
      const response = await fetch(`/api/cart/${item._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQuantity })
      });
      
      const result = await response.json();
      onQuantityChange(item._id, newQuantity);
      
      // Check if variant still has sufficient stock
      if (item.variant_id && result.stockWarning) {
        showToast(`Warning: Only ${result.availableQuantity} items in stock`, 'warning');
      }
    } catch (error) {
      console.error('Failed to update quantity:', error);
      showToast('Failed to update quantity', 'error');
    }
  };

  return (
    <div className="cart-item">
      <div className="item-info">
        <h4>{item.description}</h4>
        {displayVariantInfo()}
        <p className="price">${item.unit_price} × {item.quantity}</p>
        <p className="total">${(item.unit_price * item.quantity).toFixed(2)}</p>
        {item.tracked && (
          <span className="tracked-indicator">✓ Inventory Tracked</span>
        )}
      </div>
      <div className="item-actions">
        <input
          type="number"
          value={item.quantity}
          onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
          min="1"
          max={item.maxQuantity || 99}
        />
        <button onClick={() => onRemove(item._id)}>Remove</button>
      </div>
    </div>
  );
};
```

#### Cart Summary with Variant Breakdown
```javascript
const CartSummary = ({ cartItems }) => {
  const [variantBreakdown, setVariantBreakdown] = useState({});

  useEffect(() => {
    // Group items by product and show variant breakdown
    const breakdown = cartItems.reduce((acc, item) => {
      if (item.variant_id) {
        const key = `${item.item_id}-${item.variant_id}`;
        if (!acc[key]) {
          acc[key] = {
            product_name: item.description.split('(')[0].trim(),
            variant_attributes: item.variant_attributes,
            total_quantity: 0,
            total_price: 0
          };
        }
        acc[key].total_quantity += item.quantity;
        acc[key].total_price += item.unit_price * item.quantity;
      }
      return acc;
    }, {});
    
    setVariantBreakdown(breakdown);
  }, [cartItems]);

  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cartItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

  return (
    <div className="cart-summary">
      <h3>Cart Summary</h3>
      <div className="summary-stats">
        <p>Total Items: {totalItems}</p>
        <p>Total Price: ${totalPrice.toFixed(2)}</p>
      </div>
      
      {Object.keys(variantBreakdown).length > 0 && (
        <div className="variant-breakdown">
          <h4>Variant Breakdown</h4>
          {Object.values(variantBreakdown).map((variant, index) => (
            <div key={index} className="variant-summary">
              <span>{variant.product_name}</span>
              <div className="variant-attrs">
                {Object.entries(variant.variant_attributes).map(([k, v]) => (
                  <span key={k} className="attr-badge">{k}: {v}</span>
                ))}
              </div>
              <span>Qty: {variant.total_quantity}</span>
              <span>${variant.total_price.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

### 4. Order Processing with Variant Deduction

#### Create Order with Variants
```javascript
const createOrder = async (cartItems, orderData) => {
  try {
    // Prepare order items with variant information
    const orderItems = cartItems.map(item => ({
      item_type: item.item_type || 'inventory',
      item_id: item.item_id,
      variant_id: item.variant_id,
      variant_attributes: item.variant_attributes,
      quantity: item.quantity,
      unit_price: item.unit_price,
      description: item.description,
      tracked: item.tracked || false
    }));

    const response = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: orderItems,
        customer_id: orderData.customer_id,
        payment_method: orderData.payment_method,
        notes: orderData.notes,
        // ... other order data
      })
    });

    const result = await response.json();
    
    if (result.success) {
      // Clear cart after successful order
      await clearCart();
      
      // Show order confirmation with variant details
      const variantItems = orderItems.filter(item => item.variant_id);
      if (variantItems.length > 0) {
        showToast(`Order placed! ${variantItems.length} variant items processed with inventory deduction.`, 'success');
      } else {
        showToast('Order placed successfully!', 'success');
      }
    }
    
    return result;
  } catch (error) {
    console.error('Failed to create order:', error);
    showToast('Failed to place order', 'error');
    throw error;
  }
};
```

#### Order Confirmation with Variant Details
```javascript
const OrderConfirmation = ({ order }) => {
  const displayOrderItems = () => {
    return order.items.map((item, index) => (
      <div key={index} className="order-item">
        <div className="item-details">
          <h4>{item.description}</h4>
          {item.variant_attributes && (
            <div className="variant-attributes">
              {Object.entries(item.variant_attributes).map(([key, value]) => (
                <span key={key} className="attribute-badge">
                  {key}: {value}
                </span>
              ))}
            </div>
          )}
          <p>Quantity: {item.quantity} × ${item.unit_price}</p>
          <p className="item-total">${(item.quantity * item.unit_price).toFixed(2)}</p>
        </div>
        <div className="item-status">
          {item.inventory_deducted && (
            <span className="deducted-indicator">✓ Inventory Deducted</span>
          )}
          {item.variant_id && (
            <span className="variant-indicator">Variant Item</span>
          )}
        </div>
      </div>
    ));
  };

  return (
    <div className="order-confirmation">
      <h2>Order Confirmation</h2>
      <div className="order-info">
        <p>Order ID: {order._id}</p>
        <p>Date: {new Date(order.created_at).toLocaleString()}</p>
        <p>Status: {order.status}</p>
      </div>
      
      <div className="order-items">
        <h3>Items Ordered</h3>
        {displayOrderItems()}
      </div>
      
      <div className="order-totals">
        <p>Subtotal: ${order.subtotal.toFixed(2)}</p>
        <p>Tax: ${order.tax.toFixed(2)}</p>
        <p><strong>Total: ${order.total.toFixed(2)}</strong></p>
      </div>
    </div>
  );
};
```

#### Inventory Status After Order
```javascript
const InventoryStatus = ({ productId, variantId }) => {
  const [inventoryStatus, setInventoryStatus] = useState(null);

  useEffect(() => {
    const fetchInventoryStatus = async () => {
      try {
        const url = variantId 
          ? `/api/inventory/${productId}/variants/${variantId}`
          : `/api/inventory/${productId}`;
        
        const response = await fetch(url);
        const data = await response.json();
        setInventoryStatus(data);
      } catch (error) {
        console.error('Failed to fetch inventory status:', error);
      }
    };

    fetchInventoryStatus();
  }, [productId, variantId]);

  if (!inventoryStatus) return <div>Loading...</div>;

  return (
    <div className="inventory-status">
      <h4>Inventory Status</h4>
      {variantId ? (
        <div className="variant-status">
          <p>Variant: {inventoryStatus.name}</p>
          <p>Available: {inventoryStatus.quantity}</p>
          <p>SKU: {inventoryStatus.sku}</p>
          <p>Status: {inventoryStatus.status}</p>
        </div>
      ) : (
        <div className="product-status">
          <p>Product: {inventoryStatus.name}</p>
          <p>Total Available: {inventoryStatus.quantity}</p>
          {inventoryStatus.has_variants && (
            <p>Variants: {inventoryStatus.variants?.length || 0}</p>
          )}
        </div>
      )}
    </div>
  );
};
```

### 5. Inventory Management UI

#### Low Stock Variants Dashboard
```javascript
const LowStockVariants = () => {
  const [lowStockItems, setLowStockItems] = useState([]);

  useEffect(() => {
    const fetchLowStockVariants = async () => {
      try {
        const response = await fetch('/api/inventory/variants/low-stock');
        const data = await response.json();
        setLowStockItems(data);
      } catch (error) {
        console.error('Failed to fetch low stock variants:', error);
      }
    };

    fetchLowStockVariants();
  }, []);

  return (
    <div className="low-stock-dashboard">
      <h2>Low Stock Variants</h2>
      {lowStockItems.map(product => (
        <div key={product._id} className="low-stock-product">
          <h3>{product.name}</h3>
          <div className="low-stock-variants">
            {product.variants
              .filter(v => v.quantity <= product.min_viable_quantity)
              .map(variant => (
                <div key={variant._id} className="low-stock-variant">
                  <span className="variant-name">{variant.name}</span>
                  <div className="variant-attributes">
                    {Object.entries(variant.attributes).map(([key, value]) => (
                      <span key={key} className="attr-badge">{key}: {value}</span>
                    ))}
                  </div>
                  <span className="quantity">{variant.quantity}</span>
                  <span className="sku">SKU: {variant.sku}</span>
                  <button className="reorder-btn">Reorder</button>
                </div>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};
```

#### Real-time Inventory Updates
```javascript
const useRealTimeInventory = (productId, variantId) => {
  const [inventory, setInventory] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const url = variantId 
          ? `/api/inventory/${productId}/variants/${variantId}`
          : `/api/inventory/${productId}`;
        
        const response = await fetch(url);
        const data = await response.json();
        setInventory(data);
        setLastUpdated(Date.now());
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
      }
    };

    fetchInventory();

    // Set up WebSocket or polling for real-time updates
    const interval = setInterval(fetchInventory, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [productId, variantId]);

  return { inventory, lastUpdated };
};
```

## UI/UX Guidelines

### 1. Variant Toggle
- Show a toggle switch in product edit form to enable/disable variants
- When variants are disabled, hide all variant-related fields
- When enabling variants, show a warning that existing quantity will be replaced

### 2. Variant Management
- Use a table or card layout to display variants
- Allow inline editing of variant quantities
- Show variant attributes as badges or tags
- Include color swatches for color variants when possible

### 3. Product Selection
- For products with variants, show a "Select Options" button instead of "Add to Cart"
- Use a modal or dropdown for variant selection
- Show real-time availability checking
- Display variant-specific pricing if different from base price

### 4. Cart Experience
- Clearly display variant attributes in cart items
- Show inventory tracking indicators
- Provide variant breakdown in cart summary
- Handle quantity changes with stock validation

### 5. Order Processing
- Show variant details in order confirmation
- Display inventory deduction status
- Provide inventory status updates after orders
- Handle out-of-stock scenarios during checkout

### 6. Visual Indicators
- Use colors to indicate stock levels (green: high, yellow: low, red: out)
- Show variant counts in product listings
- Display low stock warnings prominently
- Use icons to represent different attribute types
- Show tracking indicators for inventory-managed items

### 7. Error Handling
- Show clear error messages when variant selection is required
- Handle out-of-stock scenarios gracefully
- Provide suggestions for similar variants when selected one is unavailable
- Show loading states during availability checks
- Handle inventory conflicts during order processing

## Testing Checklist

### Basic Functionality
- [ ] Enable/disable variants toggle works correctly
- [ ] Add/edit/delete variants functionality
- [ ] Variant quantity updates sync with total quantity
- [ ] Variant selection in product catalog

### Cart Testing
- [ ] Cart displays variant information correctly
- [ ] Add to cart with variants works
- [ ] Cart quantity changes validate stock
- [ ] Cart summary shows variant breakdown
- [ ] Remove variant items from cart

### Order Processing
- [ ] Order creation with variants works
- [ ] Inventory deduction occurs for variants
- [ ] Order confirmation shows variant details
- [ ] Inventory status updates after orders
- [ ] Handle insufficient stock during checkout

### Inventory Management
- [ ] Low stock alerts work for variants
- [ ] Real-time inventory updates
- [ ] Variant availability checking
- [ ] Find variant by attributes functionality

### Edge Cases
- [ ] Error handling for all scenarios
- [ ] Handle disabled variants gracefully
- [ ] Backward compatibility with non-variant items
- [ ] Concurrent inventory updates
- [ ] Network error handling

## Migration Notes

### Existing Products
- Existing products will have `has_variants: false` by default
- When enabling variants for existing products, current quantity will be set to 0
- You may want to create a default variant with the existing quantity

### Backward Compatibility
- Products without variants work exactly as before
- API endpoints maintain backward compatibility
- Existing order processing continues to work for non-variant items
- Cart system handles both variant and non-variant items seamlessly

### Data Migration
```javascript
// Example migration script to add default variants
const migrateExistingProducts = async () => {
  try {
    const products = await fetch('/api/inventory').then(r => r.json());
    
    for (const product of products.filter(p => !p.has_variants && p.quantity > 0)) {
      await addVariant(product._id, {
        name: 'Default',
        attributes: {},
        quantity: product.quantity,
        sku: product.sku || `${product.sku}-DEFAULT`,
        price: product.price
      });
      
      await enableVariants(product._id);
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }
};
```

## Performance Considerations

- Cache variant data to avoid repeated API calls
- Use pagination for products with many variants
- Implement lazy loading for variant details
- Consider indexing variant attributes for faster searches
- Optimize cart operations for variant-heavy orders
- Use WebSocket for real-time inventory updates

## Security Notes

- Validate variant IDs when processing orders
- Ensure users can only modify variants for products they have access to
- Sanitize variant attribute inputs
- Implement proper authorization for variant management endpoints
- Secure cart operations to prevent unauthorized modifications
- Audit trail for variant inventory changes

## Monitoring and Analytics

### Key Metrics to Track
- Variant selection frequency
- Cart abandonment rates for variant products
- Inventory turnover by variant
- Low stock variant alerts
- Order processing success rates for variants

### Recommended Analytics
```javascript
// Example analytics tracking
const trackVariantSelection = (productId, variantId, attributes) => {
  analytics.track('variant_selected', {
    product_id: productId,
    variant_id: variantId,
    attributes: attributes,
    timestamp: new Date().toISOString()
  });
};

const trackCartAddition = (cartItem) => {
  analytics.track('cart_item_added', {
    item_type: cartItem.item_type,
    has_variant: !!cartItem.variant_id,
    variant_attributes: cartItem.variant_attributes,
    quantity: cartItem.quantity,
    price: cartItem.unit_price
  });
};
```

This comprehensive guide ensures that variants are properly tracked throughout the entire customer journey - from product selection through cart management to order processing and inventory deduction.
