// DEMO DATA: Mock product catalog for voice-activated search feature
// This simulates a real backend database of grocery products.

export const mockCatalog = [
  { id: 'p1', name: 'Whole Milk', brand: 'DairyPure', size: '1 Gallon', price: 3.99, category: 'Dairy' },
  { id: 'p2', name: 'Almond Milk', brand: 'Silk', size: '64 oz', price: 4.49, category: 'Dairy' },
  { id: 'p3', name: 'Organic Bananas', brand: 'Chiquita', size: '1 lb', price: 0.99, category: 'Produce' },
  { id: 'p4', name: 'Honeycrisp Apples', brand: 'FarmFresh', size: '3 lbs', price: 5.99, category: 'Produce' },
  { id: 'p5', name: 'Whole Wheat Bread', brand: 'Nature''s Own', size: '20 oz', price: 3.49, category: 'Bakery' },
  { id: 'p6', name: 'Sourdough Bread', brand: 'San Francisco Bakery', size: '16 oz', price: 4.99, category: 'Bakery' },
  { id: 'p7', name: 'Large Eggs', brand: 'Eggland''s Best', size: '1 Dozen', price: 2.99, category: 'Dairy' },
  { id: 'p8', name: 'Orange Juice', brand: 'Tropicana', size: '52 oz', price: 4.29, category: 'Beverages' },
  { id: 'p9', name: 'Potato Chips', brand: 'Lay''s', size: '8 oz', price: 3.99, category: 'Snacks' },
  { id: 'p10', name: 'Sparkling Water', brand: 'LaCroix', size: '12 Pack', price: 5.49, category: 'Beverages' }
];

export const searchCatalog = (query = '', brand = '', maxPrice = null) => {
  return mockCatalog.filter(product => {
    const matchesName = query ? product.name.toLowerCase().includes(query.toLowerCase()) || product.category.toLowerCase().includes(query.toLowerCase()) : true;
    const matchesBrand = brand ? product.brand.toLowerCase().includes(brand.toLowerCase()) : true;
    const matchesPrice = maxPrice !== null ? product.price <= maxPrice : true;
    return matchesName && matchesBrand && matchesPrice;
  });
};
