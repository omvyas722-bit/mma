// Stock Agent - Monitors low stock items, summarizes inventory value
const stockData = require('../../../data/stock');
const { getDatabase } = require('../../../db/connection');

async function handler({ db, aiState, broadcast, config, agentName }) {
  try {
    console.log('[STOCK-AGENT] Starting stock check...');

    const dbConn = db || getDatabase();

    // Get all active products
    const allProducts = (stockData.getAllProducts({ active: true }) || []).slice(0, 1000);

    // 1. Find items where stock < reorder_level (min_stock_level)
    const lowStockItems = allProducts.filter(p => {
      return p && p.stock_quantity <= (p.min_stock_level || 0);
    });

    const outOfStock = allProducts.filter(p => p && p.stock_quantity <= 0);

    for (const item of lowStockItems) {
      if (!item || !item.id) continue;
      try {
        const existingAlert = dbConn.prepare(`
          SELECT id FROM stock_alerts
          WHERE product_id = ? AND status = 'active'
        `).get(item.id);

        if (!existingAlert) {
          stockData.createStockAdjustment({
            product_id: item.id,
            adjustment_type: 'correction',
            quantity: item.stock_quantity,
            reason: `[AUTO] Low stock alert: ${item.name || 'Unknown'} has ${item.stock_quantity} remaining (min: ${item.min_stock_level})`,
            adjusted_by: dbConn.prepare('SELECT id FROM staff WHERE role = ? ORDER BY id LIMIT 1').get('owner')?.id || null
          });
          console.log(`[STOCK-AGENT] Low stock alert for ${item.name || 'Unknown'} (qty: ${item.stock_quantity}, min: ${item.min_stock_level})`);
        }
      } catch (loopErr) {
        console.error(`[STOCK-AGENT] Error processing low stock item #${item.id}:`, loopErr.message);
      }
    }

    // 2. Inventory value
    const costValue = allProducts.reduce((sum, p) => sum + (p.stock_quantity * (p.cost_price || 0)), 0);
    const sellValue = allProducts.reduce((sum, p) => sum + (p.stock_quantity * (p.sell_price || 0)), 0);

    const summary = `${lowStockItems.length} items low in stock (${outOfStock.length} out of stock). Total inventory value: $${costValue.toFixed(2)} cost / $${sellValue.toFixed(2)} retail.`;

    await aiState.logActivity({
      agentName: agentName || 'stock',
      actionType: 'stock_check',
      details: {
        low_stock_count: lowStockItems.length,
        out_of_stock_count: outOfStock.length,
        total_products: allProducts.length,
        inventory_value_cost: costValue,
        inventory_value_retail: sellValue,
        low_stock_items: lowStockItems.map(i => ({ id: i.id, name: i.name, stock: i.stock_quantity, min: i.min_stock_level }))
      },
      summary
    });

    console.log(`[STOCK-AGENT] ${summary}`);

    if (lowStockItems.length > 0 && broadcast) {
      broadcast({ type: 'stock_agent_update', summary, lowStockCount: lowStockItems.length });
    }
  } catch (err) {
    console.error('[STOCK-AGENT] Error:', err.stack || err.message);
    try {
      await aiState.logActivity({
        agentName: agentName || 'stock',
        actionType: 'stock_check_error',
        details: { error: err.message },
        summary: `Stock agent failed: ${err.message}`
      });
    } catch (logErr) {
      console.error('[STOCK-AGENT] Failed to log activity:', logErr.message);
    }
  }
}

module.exports = { handler };
