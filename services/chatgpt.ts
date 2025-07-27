import OpenAI from "openai";
import { AutoParseableTextFormat, makeParseableTextFormat } from "openai/lib/parser.mjs";
import { ResponseFormatTextJSONSchemaConfig } from "openai/resources/responses/responses.mjs";
import { z } from "zod";

interface Recipe {
  title: string;
  difficulty: string;
  cooking_time: string;
  calories: number;
  lipides: number;
  proteines: number;
  icon: string;
}

console.log(process.env.OPENAI_API_KEY);
const openai = new OpenAI({
  apiKey: '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'//process.env.OPENAI_API_KEY,
});

function zodTextFormat<ZodInput extends z.ZodType>(
  zodObject: ZodInput,
  name: string,
  props?: Omit<
    ResponseFormatTextJSONSchemaConfig,
    "schema" | "type" | "strict" | "name"
  >
): AutoParseableTextFormat<z.infer<ZodInput>> {
  return makeParseableTextFormat(
    {
      type: "json_schema",
      ...props,
      name,
      strict: true,
      schema: z.toJSONSchema(zodObject, { target: "draft-7" }),
    },
    (content) => zodObject.parse(JSON.parse(content))
  );
}

export async function generateRecipesFromText(ingredients: string): Promise<Recipe[]> {
  const ChatGPTResponseObject = z.object({
    recipes: z.array(z.object({
      title: z.string(),
      difficulty: z.string(),
      cooking_time: z.number(),
      icon: z.string(),
      // ingredients: z.array(z.object({
      //   name: z.string(),
      //   quantity: z.string(),
      //   icon: z.string(),
      //   tags: z.array(z.enum(['Protein', 'Fat', 'Omega-3', 'Carbohydrate', 'Sugar', 'Vitamin', 'Mineral', 'Other'])),
      // })),
      // steps: z.array(z.object({
      //   title: z.string(),
      //   description: z.string(),
      // })),
      calories: z.number(),
      lipids: z.number(),
      proteins: z.number(),
    })),
  });

  try {
    const response: any = await openai.responses.parse({
      model: "gpt-4.1-nano",
      // tools: [{ type: "web_search_preview" }],
      instructions: `Tu es un chef cuisinier expert.
            Ne répète jamais deux plats similaires. Sois original.
            Sois créatif et propose des recettes variées et appétissantes.`,
      input: `Génère 5 recettes avec ces ingrédients : ` + "J'ai des oeufs, de la viande haché, du poulet, un peu de percil, des pates, des tomates, de l'ail, des oignons, du fromage rapé, un peu de carotte, de la bechamel, du saumon, des champignons et de la pate à pizza.", //${ingredients}`,
      text: {
        format: zodTextFormat(ChatGPTResponseObject, "recipes"),
      }
    });

    // Génère 5 recettes différentes à partir des ingrédients fournis. 
    //         Réponds UNIQUEMENT avec un JSON valide contenant un tableau "recipes" avec 5 objets à l'intérieur.
    //         Chaque objet doit avoir exactement ces propriétés :
    //         - title: string (nom du plat)
    //         - difficulty: string ("Easy", "Medium", ou "Hard")
    //         - steps: [{title: string, description: string}] (tableau d'étapes de préparation avec les quantités, il doit y avoir au MINIMUM 6 étapes pour EASY, 10 étapes pour MEDIUM et 13 étapes pour HARD, soit très précis et détaillé pour que même un débutant qui n'a jamais cuisiné puisse suivre les instructions !)
    //         - preparation_time: integer (ex: "30", "60", "90") it is in minutes
    //         - calories: number (calories au total)
    //         - lipids: number (grammes de lipides au total)
    //         - proteins: number (grammes de protéines au total)

    const recipes = response.output_parsed;
    console.log('ok');
    console.log(recipes.recipes[0].ingredients);

    if (!recipes)
      throw new Error('Réponse vide de ChatGPT');

    return recipes.recipes;
  } catch (error) {
    console.error('Erreur lors de la génération des recettes:', error);
    throw error;
  }
}

export async function getRecipeIngredients(recipe: Recipe): Promise<string[]> {
  const ChatGPTResponseObject = z.object({
    details: z.object({
      ingredients: z.array(z.object({
        name: z.string(),
        quantity: z.string(),
        icon: z.string(),
        tags: z.array(z.enum(['Protein', 'Fat', 'Omega-3', 'Carbohydrate', 'Sugar', 'Vitamin', 'Mineral', 'Other'])),
      }))
    })
  });

  try {
    const response: any = await openai.responses.parse({
      model: "gpt-4.1-nano",
      // tools: [{ type: "web_search_preview" }],
      // instructions: ``,
      input: `Je veux les ingrédients de la recette : ` + JSON.stringify(recipe),
      text: {
        format: zodTextFormat(ChatGPTResponseObject, "details"),
      }
    });

    const details = response.output_parsed;
    console.log(details.details);

    if (!details)
      throw new Error('Réponse vide de ChatGPT');

    return details.details;
  } catch (error) {
    console.error('Erreur lors de la génération des recettes:', error);
    throw error;
  }
}

export async function getRecipeSteps(recipe: Recipe): Promise<string[]> {
  const ChatGPTResponseObject = z.object({
    details: z.object({
      steps: z.array(z.object({
        title: z.string(),
        description: z.string(),
      })),
    })
  });

  try {
    const response: any = await openai.responses.parse({
      model: "gpt-4.1-nano",
      // tools: [{ type: "web_search_preview" }],
      instructions: `steps: [{title: string, description: string}] (tableau d'étapes de préparation avec les quantités, il doit y avoir au MINIMUM 6 étapes pour une recette de difficulté EASY, 10 étapes pour MEDIUM et 13 étapes pour HARD, soit très précis et détaillé pour que même un débutant qui n'a jamais cuisiné puisse suivre les instructions !)`,
      // instructions: `steps: [{title: string, description: string}] (tableau d'étapes de préparation avec les quantités, il doit y avoir au MINIMUM 6 étapes pour une recette de difficulté EASY, 10 étapes pour MEDIUM et 13 étapes pour HARD, soit très précis et détaillé pour que même un débutant qui n'a jamais cuisiné puisse suivre les instructions !)`,
      input: `Je veux les étapes de préparation de la recette : ` + JSON.stringify(recipe),
      text: {
        format: zodTextFormat(ChatGPTResponseObject, "details"),
      }
    });

    const details = response.output_parsed;
    console.log(details.details);

    if (!details)
      throw new Error('Réponse vide de ChatGPT');

    return details.details;
  } catch (error) {
    console.error('Erreur lors de la génération des recettes:', error);
    throw error;
  }
}