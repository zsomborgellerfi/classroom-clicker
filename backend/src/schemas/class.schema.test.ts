import { createClassSchema } from "./class.schema";

describe("createClassSchema", () => {
  it("accepts valid payloads", () => {
    const result = createClassSchema.parse({
      body: {
        name: "Physics 101",
        description: "Introductory course",
      },
    });

    expect(result.body).toEqual({
      name: "Physics 101",
      description: "Introductory course",
    });
  });

  it("rejects payloads without a class name", () => {
    expect(() =>
      createClassSchema.parse({
        body: {
          name: "",
        },
      }),
    ).toThrow("String must contain at least 1 character(s)");
  });
});
