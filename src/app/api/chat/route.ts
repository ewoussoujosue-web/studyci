import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, history, level, aiName, isQuiz, isFlashcards, documentText } = body;

    // On récupère la clé Mistral
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      console.error("❌ ERREUR : MISTRAL_API_KEY est introuvable dans .env.local");
      return NextResponse.json({ error: "Clé API Mistral manquante" }, { status: 500 });
    }

    let systemPrompt = `Tu es "${aiName || 'StudyCI'}", un assistant IA expert pour un étudiant ivoirien en ${level || 'Filière inconnue'}. Réponds toujours en français de manière claire et pédagogique.`;

    if (isQuiz) {
      systemPrompt = `Tu es un professeur. ${documentText ? `Voici le cours : ${documentText.slice(0, 5000)}` : ''}
      Génère un QUIZ de 5 questions à choix multiples.
      Format EXACT (sans texte autour, pas de balises markdown) :
      [{"question": "Question ?", "options": ["A", "B", "C", "D"], "correctAnswer": "A"}]`;
    }

    if (isFlashcards) {
      systemPrompt = `Tu es un professeur. L'étudiant veut réviser : "${message}".
      Génère 5 flashcards.
      Format EXACT (sans texte autour) :
      [{"question": "Question ?", "answer": "Réponse."}]`;
    }

    // Préparation de l'historique
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(history || []).map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      { role: 'user', content: message || "Bonjour" }
    ];

    // ⚠️ APPEL À L'API MISTRAL (Modèle gratuit)
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mistral-small-latest', // Modèle accessible sur le plan gratuit
        messages: messages,
        temperature: 0.7,
        ...(isQuiz || isFlashcards ? { response_format: { type: 'json_object' } } : {})
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("❌ Erreur Mistral :", data);
      
      // Si on atteint encore la limite, on affiche un message clair
      if (response.status === 429) {
         return NextResponse.json({ error: "L'IA est un peu surchargée. Attends 1 minute avant de réessayer." }, { status: 429 });
      }

      return NextResponse.json({ 
        error: data.error?.message || "Erreur de communication avec Mistral" 
      }, { status: response.status });
    }

    const aiResponse = data.choices[0].message.content;
    return NextResponse.json({ reply: aiResponse });

  } catch (error: any) {
    console.error("❌ Erreur Serveur :", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}