import CryptoJS from "crypto-js";

export const encrypt = (text: string) => {
	return CryptoJS.AES.encrypt(text, process.env.CRYPTO_SECRET!).toString();
};

export const decrypt = (cypher: string) => {
	return CryptoJS.AES.decrypt(cypher, process.env.CRYPTO_SECRET!).toString(CryptoJS.enc.Utf8);
};
