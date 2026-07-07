import { buildVelocityProfile } from "@/components/viz/velocity-profile";

describe("buildVelocityProfile", () => {
  it("classifies the flow regime from Reynolds number", () => {
    expect(buildVelocityProfile(1.5, 126).regime).toBe("turbulent");
    expect(buildVelocityProfile(0.1, 10).regime).toBe("laminar");
  });

  it("generates one arrow per radial position", () => {
    expect(buildVelocityProfile(1.5, 126).arrows).toHaveLength(9);
  });
});
