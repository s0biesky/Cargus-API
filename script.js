const axios = require("axios");
const fs = require("fs");
const credentials = require("./credentials");

class cargusAPI {
  constructor() {
    this.url = "https://urgentcargus.azure-api.net/api";
    this.axiosInstance = axios.create({
      baseURL: this.url,
      timeout: 120000,
    });

    this.token = null;
    this.awb = null;
  }

  /**
   * Logs in a user to the Cargus API to obtain an auth token.
   * @param {string} userName - The username to login with.
   * @param {string} password - The password to login with.
   * @returns {Promise<boolean>} - Promise that resolves to true if login succeeded, false otherwise.
   */
  async loginUser(userName, password) {
    const requestBody = {
      UserName: userName,
      Password: password,
    };

    try {
      const response = await this.axiosInstance.post(
        "/LoginUser",
        requestBody,
        {
          headers: {
            "Ocp-Apim-Subscription-Key": credentials.cargus.subscriptionKey,
            "Ocp-Apim-Trace": "true",
            "Content-Type": "application/json",
          },
        }
      );

      if (response.status === 200) {
        const tokenResponse = response.data;
        this.token = tokenResponse;
        console.log("LoginUser: Token obtained -", this.token);
        return true;
      } else {
        console.log("LoginUser: FALSE");
        return false;
      }
    } catch (error) {
      console.error("Error in loginUser:", error.message);
      return false;
    }
  }

  /**
   * Gets localities data from the Cargus API based on the provided county ID.
   * Requires a valid auth token from loginUser.
   * Sends a GET request to /Localities endpoint with the countyId query parameter.
   * Returns localities data if successful (status 200), null otherwise.
   * Logs any errors.
   */
  async getLocalities(countyId) {
    if (!this.token) {
      console.error("Token not available. Please login first.");
      return null;
    }
    try {
      const headers = {
        "Ocp-Apim-Subscription-Key": credentials.cargus.subscriptionKey,
        "Ocp-Apim-Trace": "true",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      };

      const queryParams = {
        countryId: 1,
        countyId: countyId,
      };

      const response = await this.axiosInstance.get("/Localities", {
        headers,
        params: queryParams,
      });

      if (response.status === 200) {
        console.log("Localities list generated successfully.");
        return response.data;
      } else {
        console.error("Error getting localities:", response.data);
        return null;
      }
    } catch (error) {
      console.error("Error getting localities:", error);
      return null;
    }
  }

  /**
   * Creates an AWB using the Cargus API
   * Requires valid auth token
   * Sends a POST request to /Awbs endpoint with awbData payload
   * Check the documentation for the awbData structure
   * Returns AWB data if successful (status 200), null otherwise
   * Logs any errors
   */
  async createAWB(awbData) {
    if (!this.token) {
      console.error("Token not available. Please login first.");
      return null;
    }
    try {
      const headers = {
        "Ocp-Apim-Subscription-Key": credentials.cargus.subscriptionKey,
        "Ocp-Apim-Trace": "true",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      };

      const response = await this.axiosInstance.post("/Awbs", awbData, {
        headers,
      });

      if (response.status === 200) {
        console.log("AWB generated successfully.");
        const awbResponse = response.data;
        this.awb = awbResponse;
        return response.data;
      } else {
        console.error("AWB not generated. Response:", response.data);
        return null;
      }
    } catch (error) {
      console.error("Error generating AWB:", error.message);
      if (error.response) {
        console.error("Error response:", error.response.data);
      }
      return null;
    }
  }

  /**
   * Fetches counties data from Cargus API.
   * Requires valid auth token.
   * Sends request to /Counties endpoint with countryId query param.
   * Returns counties data if response is 200, null otherwise.
   * Logs any errors.
   */
  async getCounties() {
    if (!this.token) {
      console.error("Token not available. Please login first.");
      return null;
    }

    try {
      const headers = {
        "Ocp-Apim-Subscription-Key": credentials.cargus.subscriptionKey,
        "Ocp-Apim-Trace": "true",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      };

      const queryParams = {
        countryId: 1,
      };
      const response = await this.axiosInstance.get("/Counties", {
        headers,
        params: queryParams,
      });

      return response.data;
    } catch (error) {
      console.error("Error:", error);
    }
  }

  /**
   * Fetches localities data from Cargus API based on provided county ID.
   * Requires valid auth token.
   * Sends request to /Localities endpoint with countyId query param.
   * Returns localities data if response is 200, null otherwise.
   * Logs any errors.
   */
  async getLocalities(countyId) {
    if (!this.token) {
      console.error("Token not available. Please login first.");
      return null;
    }
    try {
      const headers = {
        "Ocp-Apim-Subscription-Key": credentials.cargus.subscriptionKey,
        "Ocp-Apim-Trace": "true",
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
      };

      const queryParams = {
        countryId: 1,
        countyId: countyId,
      };

      const response = await this.axiosInstance.get("/Localities", {
        headers,
        params: queryParams,
      });

      if (response.status === 200) {
        console.log("Localities list generated successfully.");
        return response.data;
      }
    } catch (error) {
      console.error("Error", error);
    }
  }

  /**
   * Generates a PDF file for the AWB number using the Cargus API.
   * Makes a request to get the PDF file for the AWB number, saves it to disk
   * and returns the file name.
   */ async printAWB() {
    try {
      const headers = {
        "Ocp-Apim-Subscription-Key": credentials.cargus.subscriptionKey,
        "Ocp-Apim-Trace": "true",
        Authorization: `Bearer ${this.token}`,
      };

      const response = await this.axiosInstance.get(
        `/AwbDocuments?barCodes=${this.awb}&type=PDF&format=0`,
        { headers }
      );

      if (response.status === 200) {
        try {
          const b64PdfString = response.data;
          const fileName = `${this.awb}.pdf`;
          const binaryData = Buffer.from(b64PdfString, "base64");

          fs.writeFileSync(fileName, binaryData, "binary");
          console.log(`File saved: ${fileName}`);
          return fileName;
        } catch (error) {
          console.error("Error generating the PDF file.", error.message);
        }
      }
    } catch (error) {
      console.error("Error getting the AWB number.", error.message);
    }
  }
}
module.exports = cargusAPI;
