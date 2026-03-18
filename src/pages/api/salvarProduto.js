export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxCEXr9UDG9NB1tH90wPv1UTMT7_8Op8DA0_JJcg2H0j_uzB-RDZkusZ-TNLvbkj2zg/exec";

  try {
    const formData = new URLSearchParams();
    formData.append('dados', JSON.stringify(req.body));

    const response = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    res.status(200).json(data);

  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
}