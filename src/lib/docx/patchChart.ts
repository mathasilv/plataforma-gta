import type PizZip from "pizzip";

/**
 * Atualiza os valores do gráfico nativo do Word (Geração × Consumo) do molde Solar.
 *
 * O gráfico guarda os dados em caches numéricos (`<c:numCache>`) dentro de
 * `word/charts/chart1.xml`. A planilha de origem é externa (não embutida), então
 * basta reescrever os 12 pontos de cada série — a 1ª série é "Geração", a 2ª é
 * "Consumo", na ordem em que aparecem no XML.
 *
 * É um no-op seguro se o molde não tiver gráfico (outros serviços).
 */
export function patchSolarChart(
  zip: PizZip,
  series: { geracao: number[]; consumo: number[] },
  chartPath = "word/charts/chart1.xml",
): void {
  const file = zip.file(chartPath);
  if (!file) return; // molde sem gráfico

  let xml = file.asText();

  const caches = [series.geracao, series.consumo];
  let cacheIndex = 0;

  // Substitui cada bloco <c:numCache>...</c:numCache> na ordem
  xml = xml.replace(/<c:numCache>[\s\S]*?<\/c:numCache>/g, (block) => {
    const values = caches[cacheIndex];
    cacheIndex += 1;
    if (!values) return block; // mais caches do que séries previstas: não mexe

    // Substitui cada <c:v>...</c:v> (pontos) na ordem pelos novos valores.
    // formatCode usa <c:formatCode>, então não colide com <c:v>.
    let ptIndex = 0;
    return block.replace(/<c:v>[\s\S]*?<\/c:v>/g, (pt) => {
      const v = values[ptIndex];
      ptIndex += 1;
      if (v == null || Number.isNaN(v)) return pt;
      return `<c:v>${v.toFixed(2)}</c:v>`;
    });
  });

  zip.file(chartPath, xml);
}
