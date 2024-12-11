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

  private maxRetries = 3;
  private retryDelay = 1000; // 1 second

  constructor() {
    this.client = this.initializeClient();
  }

  private async initializeClient() {
    try {
      return await Client.connect("shuttleai/shuttle-3.1-aesthetic", {
        statusCallback: (status) => {
          console.log(`Shuttle.ai client status: ${status}`);
        },
      });
    } catch (error) {
      console.error("Failed to initialize Shuttle.ai client:", error);
      throw new Error("Image generation service initialization failed");
    }
  }

  private async retryOperation<T>(
    operation: () => Promise<T>,
    retryCount = 0
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (retryCount < this.maxRetries) {
        console.log(`Retrying operation, attempt ${retryCount + 1} of ${this.maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));
        return this.retryOperation(operation, retryCount + 1);
      }
      throw error;
    }
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
        seed = Math.floor(Math.random() * 1000000)
      } = config;

      console.log(`Generating image for prompt: ${prompt}`);
      
      const result = await this.retryOperation(async () => {
        const predictionResult = await client.predict("/infer", {
          prompt,
          seed,
          randomize_seed: randomizeSeed,
          width,
          height,
          num_inference_steps: numInferenceSteps,
        });

        if (!predictionResult || !Array.isArray(predictionResult.data) || predictionResult.data.length === 0) {
          throw new Error("No image data received from the model");
        }

        return predictionResult;
      });

      // Validate the image data URL
      const imageUrl = result.data[0] as string;
      if (!imageUrl.startsWith('data:image/') && !imageUrl.startsWith('https://')) {
        throw new Error("Invalid image data received from the model");
      }

      return imageUrl;
    } catch (error) {
      console.error("Image generation failed:", error);
      throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Export singleton instance
export const imageGenerator = new ImageGenerator();
