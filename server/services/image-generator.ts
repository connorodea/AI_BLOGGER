import { Client } from "@gradio/client";

interface ImageGenerationConfig {
  width?: number;
  height?: number;
  numInferenceSteps?: number;
  randomizeSeed?: boolean;
  seed?: number;
}

class ImageGenerator {
  private client: Promise<Client>;

  constructor() {
    this.client = Client.connect("shuttleai/shuttle-3.1-aesthetic");
  }

  async generateImage(
    prompt: string,
    config: ImageGenerationConfig = {}
  ): Promise<string> {
    try {
      const client = await this.client;
      const {
        width = 1024,
        height = 1024,
        numInferenceSteps = 4,
        randomizeSeed = true,
        seed = 0
      } = config;

      console.log(`Generating image for prompt: ${prompt}`);
      
      const result = await client.predict("/infer", {
        prompt,
        seed,
        randomize_seed: randomizeSeed,
        width,
        height,
        num_inference_steps: numInferenceSteps,
      });

      if (!result || !Array.isArray(result.data) || result.data.length === 0) {
        throw new Error("No image data received from the model");
      }

      // The result.data[0] will be the image data URL
      return result.data[0] as string;
    } catch (error) {
      console.error("Image generation failed:", error);
      throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const imageGenerator = new ImageGenerator();
