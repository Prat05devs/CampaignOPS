import { Injectable } from "@nestjs/common";

@Injectable()
export class HealthService {
  getHealth() {
    return {
      service: "campaignops-api",
      status: "ok",
      timestamp: new Date().toISOString()
    };
  }
}

