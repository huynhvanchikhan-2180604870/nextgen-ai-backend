// MongoDB initialization script
db = db.getSiblingDB("nextgen-ai");

// Create collections with validation
db.createCollection("users", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "password", "fullName"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+.[a-zA-Z]{2,}$",
        },
        password: {
          bsonType: "string",
          minLength: 6,
        },
        fullName: {
          bsonType: "string",
          minLength: 2,
          maxLength: 100,
        },
      },
    },
  },
});

db.createCollection("projects", {
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["title", "description", "price", "author"],
      properties: {
        title: {
          bsonType: "string",
          minLength: 1,
          maxLength: 200,
        },
        price: {
          bsonType: "number",
          minimum: 0,
        },
      },
    },
  },
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ "socialAccounts.google.id": 1 });
db.users.createIndex({ "socialAccounts.github.id": 1 });

db.projects.createIndex({ title: "text", description: "text", tags: "text" });
db.projects.createIndex({ author: 1 });
db.projects.createIndex({ techStack: 1 });
db.projects.createIndex({ price: 1 });
db.projects.createIndex({ featured: 1 });
db.projects.createIndex({ status: 1 });

print("✅ Database initialized successfully!");
