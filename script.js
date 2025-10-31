// Simple localStorage-based analytics + minimal chart drawing (no external libs)
(function(){
  const LS_KEYS = {
    TOTAL: 'te_total_visits',
    TODAY: 'te_today_visits',
    DAYSTAMP: 'te_daystamp',
    SERIES: 'te_series', // array of {d:'YYYY-MM-DD', v:number}
    USERS: 'te_registered_users' // array of users
  };

  // Utilities
  const todayStr = () => new Date().toISOString().slice(0,10);
  const clamp7 = (arr) => arr.slice(-7);

  function load(key, fallback){
    try{ return JSON.parse(localStorage.getItem(key)) ?? fallback; }catch(e){ return fallback; }
  }
  function save(key, val){
    localStorage.setItem(key, JSON.stringify(val));
  }

  // --- Initialize analytics on every page view ---
  const dayNow = todayStr();
  const prevDay = load(LS_KEYS.DAYSTAMP, dayNow);

  let total = load(LS_KEYS.TOTAL, 0);
  let today = load(LS_KEYS.TODAY, 0);
  let series = load(LS_KEYS.SERIES, []);

  if (prevDay !== dayNow){
    // Day changed: push the previous day's value
    series.push({ d: prevDay, v: today });
    series = clamp7(series);
    today = 0;
  }
  total += 1;
  today += 1;

  save(LS_KEYS.TOTAL, total);
  save(LS_KEYS.TODAY, today);
  save(LS_KEYS.DAYSTAMP, dayNow);
  save(LS_KEYS.SERIES, series);

  // --- Update dashboard if present ---
  const totalEl = document.getElementById('totalVisits');
  const todayEl = document.getElementById('todayVisits');
  const usersEl = document.getElementById('registeredUsers');
  const yearEl  = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  if (totalEl) totalEl.textContent = total.toLocaleString();
  if (todayEl) todayEl.textContent = today.toLocaleString();

  const users = load(LS_KEYS.USERS, []);
  if (usersEl) usersEl.textContent = users.length.toLocaleString();

  // Draw chart (last 7 days + current day)
  const canvas = document.getElementById('visitsChart');
  if (canvas){
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);

    // Compose dataset: last 6 days from series + today
    const data = [...series.slice(-6), { d: dayNow, v: today }];
    const labels = data.map(x => x.d.slice(5)); // MM-DD
    const values = data.map(x => x.v);
    const maxV = Math.max(5, ...values);
    const pad = 40;
    const barW = (W - pad*2) / (values.length * 1.5);
    const gap = barW / 2;

    // Axis
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, H - pad);
    ctx.lineTo(W - pad, H - pad);
    ctx.moveTo(pad, pad);
    ctx.lineTo(pad, H - pad);
    ctx.stroke();

    // Bars
    ctx.fillStyle = '#6aa8ff';
    values.forEach((v,i)=>{
      const x = pad + i * (barW + gap) + gap;
      const h = (v / maxV) * (H - pad*2);
      ctx.fillRect(x, H - pad - h, barW, h);
    });

    // Labels
    ctx.fillStyle = 'rgba(233,241,247,0.9)';
    ctx.font = '12px system-ui, Segoe UI, sans-serif';
    labels.forEach((lb,i)=>{
      const x = pad + i * (barW + gap) + gap + barW/2;
      ctx.textAlign = 'center';
      ctx.fillText(lb, x, H - pad + 16);
    });

    // Title
    ctx.textAlign = 'left';
    ctx.fillText('จำนวนเข้าชม/วัน', pad, pad - 10);
  }

  // --- Signup page behavior ---
  const form = document.getElementById('signupForm');
  if (form){
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const name = document.getElementById('fullName').value.trim();
      const email = document.getElementById('email').value.trim();
      const pw = document.getElementById('password').value;
      const cf = document.getElementById('confirm').value;

      // Simple validations
      const setErr = (id, msg)=>{
        const el = document.querySelector(`[data-error-for="${id}"]`);
        if (el) el.textContent = msg || '';
      };
      setErr('fullName',''); setErr('email',''); setErr('password',''); setErr('confirm','');

      let ok = true;
      if (!name){ setErr('fullName','กรุณากรอกชื่อ-นามสกุล'); ok = false; }
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
      if (!emailOk){ setErr('email','อีเมลไม่ถูกต้อง'); ok = false; }
      if (pw.length < 6){ setErr('password','รหัสผ่านอย่างน้อย 6 ตัวอักษร'); ok = false; }
      if (pw !== cf){ setErr('confirm','รหัสผ่านไม่ตรงกัน'); ok = false; }

      if (!ok) return;

      const users = load(LS_KEYS.USERS, []);
      const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
      if (exists){
        setErr('email','อีเมลนี้มีผู้ใช้งานแล้ว');
        return;
      }

      users.push({ name, email, createdAt: new Date().toISOString() });
      save(LS_KEYS.USERS, users);

      document.getElementById('successBox').hidden = false;
      form.reset();
    });
  }
})();