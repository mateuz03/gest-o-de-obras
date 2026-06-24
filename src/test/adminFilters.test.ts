import { describe, expect, it } from "vitest";

import {
  filterFeaturedItems,
  filterMarketplaceReports,
  filterPendingStores,
  type AdminFeaturedItemRow,
  type AdminMarketplaceReportRow,
  type AdminPendingStoreRow,
} from "@/lib/admin";

const pendingStores: AdminPendingStoreRow[] = [
  {
    id: "1",
    nome_loja: "Concreto Joao",
    cnpj: "11.111.111/0001-11",
    cidade: "Sao Paulo",
    estado: "SP",
    categoria: "Estrutural",
    created_at: "2026-06-01T10:00:00.000Z",
  },
  {
    id: "2",
    nome_loja: "Acabamentos Alpha",
    cnpj: "22.222.222/0001-22",
    cidade: "Belo Horizonte",
    estado: "MG",
    categoria: "Acabamento",
    created_at: "2026-06-10T10:00:00.000Z",
  },
  {
    id: "3",
    nome_loja: "Base Forte",
    cnpj: "33.333.333/0001-33",
    cidade: "Curitiba",
    estado: "PR",
    categoria: "Fundacao",
    created_at: "2026-05-20T10:00:00.000Z",
  },
];

const reports: AdminMarketplaceReportRow[] = [
  {
    id: "r1",
    created_at: "2026-06-20T10:00:00.000Z",
    status: "pending",
    reason: "Fraude",
    details: "Preco fora do padrao",
    decision_reason: null,
    target_type: "produto",
    target_id: "p1",
    reporter_id: "u1",
    reporter_name: "Maria Souza",
    reporter_email: "maria@example.com",
    target_name: "Cimento CP2",
    target_owner_id: "o1",
    target_owner_name: "Loja Central",
    target_hidden: false,
    total_rows: 2,
  },
  {
    id: "r2",
    created_at: "2026-06-18T10:00:00.000Z",
    status: "resolved",
    reason: "Duplicado",
    details: "Anuncio repetido",
    decision_reason: "Conteudo removido",
    target_type: "loja",
    target_id: "l1",
    reporter_id: "u2",
    reporter_name: "Carlos Lima",
    reporter_email: "carlos@example.com",
    target_name: "Casa do Piso",
    target_owner_id: "o2",
    target_owner_name: "Casa do Piso",
    target_hidden: true,
    total_rows: 2,
  },
];

const featuredItems: AdminFeaturedItemRow[] = [
  {
    type: "produto",
    id: "p1",
    nome: "Argamassa Premium",
    is_featured: true,
    featured_until: "2026-06-30T10:00:00.000Z",
  },
  {
    type: "loja",
    id: "l1",
    nome: "Loja Sao Bento",
    is_featured: false,
    featured_until: null,
  },
];

describe("admin filter helpers", () => {
  it("filters pending stores by text and repeated submissions", () => {
    const filtered = filterPendingStores(pendingStores, {
      query: "sao paulo",
      onlyRepeated: true,
      previousRejections: {
        "11.111.111/0001-11": 2,
      },
    });

    expect(filtered).toHaveLength(1);
    expect(filtered[0].nome_loja).toBe("Concreto Joao");
  });

  it("sorts pending stores by newest when requested", () => {
    const filtered = filterPendingStores(pendingStores, {
      sortBy: "newest",
    });

    expect(filtered.map((row) => row.id)).toEqual(["2", "1", "3"]);
  });

  it("matches marketplace reports across target, reason and reporter fields", () => {
    expect(filterMarketplaceReports(reports, "fraude")).toHaveLength(1);
    expect(filterMarketplaceReports(reports, "casa do piso")).toHaveLength(1);
    expect(filterMarketplaceReports(reports, "maria@example.com")).toHaveLength(1);
  });

  it("matches featured items by name and type", () => {
    expect(filterFeaturedItems(featuredItems, "premium")).toHaveLength(1);
    expect(filterFeaturedItems(featuredItems, "loja")).toHaveLength(1);
  });
});
