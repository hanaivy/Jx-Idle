/* Cân bằng quái đánh ải: dùng chung cho game và bảng tra chỉ số. */
'use strict';
window.JX_ENEMY_BALANCE = (() => {
  // Giữ công thức gốc; không thêm hệ số theo cấp quái.
  function scaling() { return { hp: 1, dmg: 1, ar: 1, def: 1 }; }
  function stats(level, cls, factors) {
    const L = Math.max(1, Math.min(9999, Number(level) || 1)), g = scaling(L, cls);
    return { hp: (18 + 8 * L + 0.55 * L * L) * factors.hp * g.hp,
      dmg: (2 + L + 0.006 * L * L) * factors.dmg * g.dmg,
      ar: (30 + L * 9) * g.ar, def: (8 + L * 3.2) * g.def };
  }
  return { scaling, stats };
})();
