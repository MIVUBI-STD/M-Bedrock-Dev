import { describe, expect, it } from "vitest";
import {
  assessAnimationControllers,
  parseAnimationControllers,
  parseResourcePackAnimations,
} from "../src/index.js";

const source = { artifactId: "fixture", relativePath: "resource_pack/animation_controllers/demo.json" };

describe("resource-pack animation analysis", () => {
  it("preserves controller states, initial state, transitions and Molang", () => {
    const controllers = parseAnimationControllers({
      format_version: "1.10.0",
      animation_controllers: {
        "controller.animation.demo": {
          initial_state: "idle",
          states: {
            idle: {
              animations: ["animation.demo.idle"],
              transitions: [{ moving: "query.modified_move_speed > 0.0" }],
            },
            moving: {
              animations: ["animation.demo.walk"],
              transitions: [{ idle: "query.modified_move_speed <= 0.0" }],
            },
          },
        },
      },
    }, source);

    expect(controllers[0]).toMatchObject({
      id: "controller.animation.demo",
      initialState: "idle",
      formatVersion: "1.10.0",
      molangExpressions: [
        "query.modified_move_speed <= 0.0",
        "query.modified_move_speed > 0.0",
      ],
    });
  });

  it("separates animation content from controller transition validity", () => {
    const animations = parseResourcePackAnimations({
      format_version: "1.8.0",
      animations: {
        "animation.demo.idle": {},
      },
    }, source);
    const controllers = parseAnimationControllers({
      animation_controllers: {
        "controller.animation.demo": {
          states: {
            default: {
              animations: ["animation.demo.idle", "animation.demo.missing"],
              transitions: [{ missing_state: "query.is_moving" }],
            },
          },
        },
      },
    }, source);

    expect(assessAnimationControllers(controllers, animations)[0]).toMatchObject({
      initialState: "default",
      initialStateExists: true,
      transitionTargetsMissing: ["missing_state"],
      missingAnimations: ["animation.demo.missing"],
      molangExpressions: ["query.is_moving"],
    });
  });
});
