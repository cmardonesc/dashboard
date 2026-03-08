
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface Recipe {
  title: string;
  ingredients: string[];
  instructions: string[];
  protein: string;
  calories: string;
}

const ChefAssistant: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateRecipe = async (category: string) => {
    setLoading(true);
    setError(null);
    try {
      const prompt = `Eres un Chef Nutricionista Deportivo experto en futbolistas jóvenes de élite. 
      Genera una receta rápida, saludable y alta en proteína para la categoría: ${category}.
      La respuesta debe ser un objeto JSON con el siguiente formato:
      {
        "title": "Nombre de la receta",
        "ingredients": ["ingrediente 1", "ingrediente 2"],
        "instructions": ["paso 1", "paso 2"],
        "protein": "cantidad de proteína aprox",
        "calories": "calorías aprox"
      }
      Solo devuelve el JSON, sin texto adicional.`;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const data = JSON.parse(response.text || '{}');
      setRecipe(data);
    } catch (err) {
      console.error("Error generating recipe:", err);
      setError("No pude contactar al Chef en este momento. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { id: 'post-entreno', label: 'Post-Entrenamiento', icon: 'fa-battery-full', color: 'text-emerald-500' },
    { id: 'desayuno-rapido', label: 'Desayuno Rápido', icon: 'fa-sun', color: 'text-amber-500' },
    { id: 'snack-proteico', label: 'Snack Proteico', icon: 'fa-egg', color: 'text-indigo-500' },
    { id: 'cena-ligera', label: 'Cena Ligera', icon: 'fa-moon', color: 'text-blue-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-[#0b1220] rounded-[40px] p-10 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-red-600/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="relative z-10 flex items-center gap-6">
          <div className="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center text-4xl shadow-lg shadow-red-900/40">
            <i className="fa-solid fa-hat-chef"></i>
          </div>
          <div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-1">Chef Assistant</h2>
            <p className="text-white/50 text-xs font-bold uppercase tracking-widest">Recetas de alto rendimiento para el atleta moderno</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => generateRecipe(cat.label)}
            disabled={loading}
            className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all group disabled:opacity-50"
          >
            <div className={`w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-xl mb-4 ${cat.color} group-hover:scale-110 transition-transform`}>
              <i className={`fa-solid ${cat.icon}`}></i>
            </div>
            <span className="text-[11px] font-black text-slate-900 uppercase tracking-tight block text-left leading-tight">{cat.label}</span>
          </button>
        ))}
      </div>

      {loading && (
        <div className="bg-white p-12 rounded-[40px] text-center border border-slate-100 shadow-sm animate-pulse">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <i className="fa-solid fa-utensils animate-bounce text-red-600 text-2xl"></i>
          </div>
          <p className="text-slate-900 font-black uppercase tracking-widest text-xs">El Chef está cocinando tu idea...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-[32px] text-red-600 text-xs font-bold uppercase tracking-widest text-center">
          {error}
        </div>
      )}

      {recipe && !loading && (
        <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl overflow-hidden animate-in slide-in-from-bottom-8 duration-500">
          <div className="bg-slate-900 p-10 text-white flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black italic uppercase tracking-tighter mb-2">{recipe.title}</h3>
              <div className="flex gap-4">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-bolt text-amber-500 text-xs"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{recipe.protein} Proteína</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-fire text-red-500 text-xs"></i>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60">{recipe.calories} Calorías</span>
                </div>
              </div>
            </div>
            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-2xl">
              <i className="fa-solid fa-plate-utensils"></i>
            </div>
          </div>

          <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-red-600 rounded-full"></span>
                Ingredientes
              </h4>
              <ul className="space-y-3">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex items-center gap-3 text-xs font-bold text-slate-500">
                    <i className="fa-solid fa-check text-emerald-500 text-[10px]"></i>
                    {ing}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
                Preparación
              </h4>
              <div className="space-y-4">
                {recipe.instructions.map((step, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="text-[10px] font-black text-slate-300 mt-0.5">{i + 1}</span>
                    <p className="text-xs font-bold text-slate-600 leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChefAssistant;
