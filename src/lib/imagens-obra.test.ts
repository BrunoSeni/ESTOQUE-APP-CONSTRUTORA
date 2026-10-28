import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { conferirImagem, guardarImagemObra, imagensDaObra, lerImagemObra, removerImagemObra } from "./imagens-obra";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);

let pasta: string;

beforeEach(() => {
  pasta = mkdtempSync(path.join(tmpdir(), "imagens-obra-"));
});

describe("imagens da obra", () => {
  it("aceita só PNG, JPG ou WEBP e até 15 MB", () => {
    expect(conferirImagem(PNG)).toEqual({ ext: "png" });
    expect(conferirImagem(JPG)).toEqual({ ext: "jpg" });
    expect(conferirImagem(Buffer.from("%PDF-1.4 qualquer coisa"))).toHaveProperty("erro");
    expect(conferirImagem(Buffer.concat([JPG, Buffer.alloc(16 * 1024 * 1024)]))).toHaveProperty("erro");
  });

  it("guarda, troca e remove o logo sem mexer na fachada", () => {
    expect(imagensDaObra(pasta, 1)).toEqual({ logo: null, fachada: null });

    expect(guardarImagemObra(pasta, 1, "logo", PNG)).toBeNull();
    expect(guardarImagemObra(pasta, 1, "fachada", JPG)).toBeNull();
    expect(lerImagemObra(pasta, 1, "logo")?.mime).toBe("image/png");
    expect(imagensDaObra(pasta, 1).logo).toMatch(/^\/obras\/1\/imagem\/logo\?v=\d+$/);
    expect(imagensDaObra(pasta, 2)).toEqual({ logo: null, fachada: null });

    // Trocar o logo de PNG para JPG não deixa o arquivo antigo para trás.
    guardarImagemObra(pasta, 1, "logo", JPG);
    expect(readdirSync(pasta).sort()).toEqual(["1-fachada.jpg", "1-logo.jpg"]);

    removerImagemObra(pasta, 1, "logo");
    expect(lerImagemObra(pasta, 1, "logo")).toBeNull();
    expect(lerImagemObra(pasta, 1, "fachada")?.mime).toBe("image/jpeg");
  });

  it("não guarda arquivo que não é imagem", () => {
    expect(guardarImagemObra(pasta, 1, "logo", Buffer.from("texto"))).toHaveProperty("erro");
    expect(readdirSync(pasta)).toEqual([]);
  });
});
