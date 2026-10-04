/* ======================= BẢNG THỬ NGHIỆM (admin panel) =======================
   Mục đích: trải nghiệm nhanh một tính năng mà không phải cày cuốc.
   GIỚI HẠN THEO YÊU CẦU: mỗi ngày chỉ MỞ ĐƯỢC 1 LẦN và CHỌN DUY NHẤT 1 option.
   Mốc ngày lưu ở S.adminDay (migrate đã chuẩn hoá). Đây KHÔNG phải công cụ chống gian lận:
   game chạy hoàn toàn trên máy người chơi nên ai quyết tâm vẫn sửa được — nó chỉ để trải nghiệm có kiểm soát. */
'use strict';
const ADMIN_OPTS = [
  { k: 'lv', n: 'Lên thẳng cấp trần',
    d: 'Cấp = trần hiện tại, cộng đủ điểm tiềm năng (' + PTS_PER_LEVEL + '/cấp) và điểm võ công (' + SKILL_PTS_PER_LEVEL + '/cấp)',
    fn: () => { const gap = Math.max(0, MAX_LEVEL - S.lvl); S.lvl = MAX_LEVEL; S.xp = 0; S.attrPts += gap * PTS_PER_LEVEL; S.skPts += gap * SKILL_PTS_PER_LEVEL; return 'Cấp ' + MAX_LEVEL + ' (+' + gap * PTS_PER_LEVEL + ' điểm tiềm năng, +' + gap * SKILL_PTS_PER_LEVEL + ' điểm võ công)'; } },
  { k: 'gold', n: 'Ngân lượng',
    d: 'Cộng 10.000.000 lượng',
    fn: () => { S.gold += 1e7; return '+10.000.000 lượng'; } },
  { k: 'mats', n: 'Nguyên liệu đầy đủ',
    d: '99 Huyền Tinh mỗi cấp 1–5, 20 Tinh Hồng Bảo Thạch, 50 Thủy Tinh Trắng / Thần Bí Khoáng Thạch',
    fn: () => { for (let l = 1; l <= 5; l++) matAdd('ht', l, 99); matAdd('misc', 'thbt', 20); matAdd('misc', 'wc', 50); matAdd('misc', 'mys', 50); return 'đã thêm nguyên liệu'; } },
  { k: 'zones', n: 'Mở toàn bộ vùng',
    d: 'Mở hết ải để xem mọi bản đồ và mọi loại quái',
    fn: () => { S.maxStage = Math.max(S.maxStage, STAGES); S.stage = S.maxStage; return 'mở tới ải ' + STAGES; } },
  { k: 'enh', n: 'Cường hoá +10 toàn bộ đồ đang mặc',
    d: 'Mọi món đang mặc lên +' + ENH_MAX + ' (thuộc tính gốc +' + Math.round(ENH_STEP * ENH_MAX * 100) + '%)',
    fn: () => { let n = 0; for (const k in S.eq) { const it = S.eq[k]; if (it) { it.enh = ENH_MAX; n++; } } return 'đã cường hoá ' + n + ' món lên +' + ENH_MAX; } },
  { k: 'gear', n: 'Một bộ Hoàng Kim đủ ô',
    d: 'Phát một bộ Hoàng Kim đủ món của phái đang chơi (mức may mắn tối đa), tặng thêm điểm cho đủ yêu cầu Sức mạnh / Thân pháp. Chọn bộ cao nhất mặc được ở cấp hiện tại. Đồ đang mặc được cất vào hành trang',
    fn: () => {
      const f = FAC[S.fac]; if (!f) return 'chưa chọn phái';
      const lvOf = r => (r.req.find(q => q[0] === 36) || [0, 0])[1];
      const facOf = r => (r.req.find(q => q[0] === 39) || [0, -1])[1];
      // chi lay mon goc cua bo (khong lay ban "[Tong Kim]" trung ten) va bo co the DU o 10 o (nguong bo mo duoc)
      const mine = J.sets.gold.filter(r => facOf(r) === f.id && sexReqOk(r.req) && !/^\[/.test(r.n) && r.req.every(([id, v]) => id !== 37 || v < 0 || v === heroSeries()));
      const groups = {}; for (const r of mine) (groups[r.grp] = groups[r.grp] || []).push(r);
      const onePerSlot = rows => { const used = {}, out = []; for (const r of rows) { const sl = DETAIL_SLOT[r.d], cap = sl === 'ring' ? 2 : 1; used[sl] = used[sl] || 0; if (used[sl] >= cap) continue; used[sl]++; out.push(r); } return out; };
      const cand = Object.values(groups).map(rows => { const pick = onePerSlot(rows); return { rows: pick, lv: Math.max(...pick.map(lvOf)) }; }).filter(g => g.rows.length >= 3);
      const ok = cand.filter(g => g.lv <= S.lvl);
      if (!ok.length) throw new Error('Chưa đủ cấp mặc bộ Hoàng Kim của phái này');
      const best = ok.sort((a, b) => b.lv - a.lv || b.rows.length - a.rows.length)[0];
      let n = 0, rings = 0; const need = {};
      for (const r of best.rows) {
        const slot = DETAIL_SLOT[r.d], k = slot === 'ring' ? 'ring' + (++rings) : slot; if (!k) continue;
          const it = makeSetItem('gold', r, 10), old = S.eq[k];
          if (old) { old.locked = true; S.inv.unshift(old); }   // giữ đồ kể cả khi túi đầy; Auto không bán
          S.eq[k] = it; n++;
          if (typeof dexSet === 'function') dexSet(it.n);
          const d = reqDeficit(it); for (const a in d) need[a] = Math.max(need[a] || 0, d[a]);
      }
      // yeu cau Suc manh / Than phap... la nguong, khong tieu hao: tang diem de du dieu kien cho ca bo (cap thi khong the tang o day)
      let added = 0; for (const a in need) { S.attr[a] += need[a]; added += need[a]; }
      return 'đã mặc ' + n + ' món bộ Hoàng Kim cấp ' + best.lv + (added ? ', tặng ' + added + ' điểm cho đủ yêu cầu' : '');
    } },
  { k: 'unlock', n: 'Mở khoá tính năng',
    d: 'Tháp thử thách, đồng hành (không cần đủ cấp), gọi ngay Trùm Hoàng Kim và thêm 5 lượt Tài Xỉu hôm nay',
    fn: () => { const r = RW(); r.unlockAll = 1; r.gbT = 0; const t = txState(); t.bonus = (t.bonus || 0) + 5; return 'đã mở khoá (tháp, đồng hành, trùm Hoàng Kim, +5 lượt Tài Xỉu)'; } },
];
const adminHomNay = () => localISODay();   // theo giờ máy (UTC làm lượt mới mở lúc 7 giờ sáng ở Việt Nam)
const adminDaDung = () => S.adminDay === adminHomNay();
function adminApply(k) {
  if (adminDaDung()) { toast('Hôm nay đã dùng bảng thử nghiệm rồi'); return; }
  const o = ADMIN_OPTS.find(x => x.k === k); if (!o) return;
  let kq = 'xong';
  try { kq = o.fn() || 'xong'; } catch (e) { toast('Lỗi: ' + (e && e.message)); return; }
  S.adminDay = adminHomNay();
  R.dirty = true; invDirty = true;
  try { recalc(); } catch (e) { /* bo qua */ }
  save();
  toast('Thử nghiệm: ' + o.n + ' — ' + kq);
  try { log('<span style="color:#8fe34a">[Thử nghiệm]</span> ' + esc(o.n) + ' — ' + esc(kq)); } catch (e) { /* bo qua */ }
  if (typeof renderAll === 'function') renderAll();
}
function adminModal() {
  if (adminDaDung()) {
    modal('<h3>Bảng thử nghiệm</h3><div class="card"><p class="desc">Hôm nay bạn đã dùng rồi. Mỗi ngày chỉ mở được <b>1 lần</b> và chọn <b>1</b> option.</p>'
      + '<p class="dim small">Lượt mới vào ngày mai (theo giờ máy).</p></div>'
      + '<div class="btnrow"><button class="btn" onclick="closeModal()">Đóng</button></div>');
    return;
  }
  modal('<h3>Bảng thử nghiệm <small>1 lần mỗi ngày · chọn 1</small></h3>'
    + '<p class="desc">Chọn <b>một</b> option để trải nghiệm nhanh. Sau khi chọn, hôm nay không mở lại được nữa.</p>'
    + ADMIN_OPTS.map(o => '<div class="card"><b>' + esc(o.n) + '</b><br><small class="dim">' + esc(o.d) + '</small>'
      + '<div class="btnrow"><button class="btn" data-ad="' + o.k + '">Chọn</button></div></div>').join('')
    + '<div class="btnrow"><button class="btn" onclick="closeModal()">Để mai</button></div>', () => {
      document.querySelectorAll('#mBody [data-ad]').forEach(b => b.onclick = () => { adminApply(b.dataset.ad); closeModal(true); });
    });
}
