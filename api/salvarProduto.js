export default async function handler(req, res) {
  try {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyNY0dSsovyPSuoWtTxrIv-HWfO2FFv4sqrcgSqEGAsHYRi6ljIcsdRlkWy_BsET3fo/exec";

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: new URLSearchParams({
        dados: JSON.stringify(req.body)
      })
    });

    const text = await response.text();

    // 👇 DEBUG (muito importante)
    console.log("Resposta Apps Script:", text);

    try {
      const json = JSON.parse(text);
      return res.status(200).json(json);
    } catch {
      return res.status(500).json({
        success: false,
        error: "Resposta não é JSON",
        raw: text // 👈 mostra erro real
      });
    }

  } catch (erro) {
    return res.status(500).json({
      success: false,
      error: erro.message
    });
  }
}