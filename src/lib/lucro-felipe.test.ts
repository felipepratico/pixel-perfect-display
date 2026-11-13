import { expect, test } from "vitest";
import { computeRow } from "./fincontrol";
const base = { mensal_site: 70, custo_boleto: 3.45, francisco_pct: 5 };
test("em dia: lucro Felipe 63,05", () => { expect(computeRow(base).lucroFelipe).toBeCloseTo(63.05, 2); });
test("com juros 75,35: Francisco 3,50 e lucro Felipe 68,40", () => {
  const r = computeRow({ ...base, valor_total: 75.35 });
  expect(r.lucroFrancisco).toBeCloseTo(3.5, 2);
  expect(r.lucroFelipe).toBeCloseTo(68.4, 2);
});
