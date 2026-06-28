import mongoose from "mongoose";

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  const dbName = process.env.DB_NAME || "apna_zoom_clone";

  if (!mongoUri) {
    console.error("MONGO_URI is missing in .env");
    process.exit(1);
  }

  try {
    mongoose.set("strictQuery", true);

    const connection = await mongoose.connect(mongoUri, {
      dbName,
      serverSelectionTimeoutMS: 20000,
      socketTimeoutMS: 45000
    });

    console.log(`MongoDB connected: ${connection.connection.host}`);
    console.log(`Database name: ${connection.connection.name}`);
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);

    if (process.env.REQUIRE_DB === "true") {
      process.exit(1);
    }
  }
};

export default connectDB;
