export default async function handler(req, res) {
  try {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyAKIsUlyCTuaAz207yVQJkEJGx0P4ARE_M1PTI78sEJBuTtyQ-ApY3QkX6SN0SmcfO/exec";

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: new URLSearchParams({
        dados: JSON.stringify(req.body)
      })
    });

    const text = await response.text();

    return res.status(200).json(JSON.parse(text));

  } catch (erro) {
    return res.status(500).json({
      success: false,
      error: erro.message
    });
  }
}