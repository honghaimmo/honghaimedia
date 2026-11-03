const root = document.querySelector('#products');
const search = document.querySelector('#search');
let products = [];
const money = n => new Intl.NumberFormat('vi-VN').format(Number(n)) + ' đ';
function render() {
  const q = (search.value || '').trim().toLocaleLowerCase('vi');
  const filtered = products.filter(p => `${p.name} ${p.category} ${p.description}`.toLocaleLowerCase('vi').includes(q));
  root.innerHTML = '';
  if (!filtered.length) { root.innerHTML = '<p class="muted">Chưa có sản phẩm phù hợp hoặc danh mục chưa được quản trị viên đăng bán.</p>'; return; }
  for (const p of filtered) {
    const card = document.createElement('article'); card.className = 'product';
    const title = document.createElement('h3'); title.textContent = p.name;
    const category = document.createElement('small'); category.textContent = p.category;
    const desc = document.createElement('p'); desc.textContent = p.description;
    const price = document.createElement('div'); price.className = 'price'; price.textContent = money(p.price);
    card.append(category, title, desc, price); root.append(card);
  }
}
async function load() {
  try {
    const response = await fetch('/api/products');
    if (!response.ok) throw new Error('API unavailable');
    const data = await response.json(); products = data.items; render();
  } catch {
    root.innerHTML = '<p class="muted">Không tải được sản phẩm. Máy chủ API chưa sẵn sàng.</p>';
  }
}
search.addEventListener('input', render);
load();
