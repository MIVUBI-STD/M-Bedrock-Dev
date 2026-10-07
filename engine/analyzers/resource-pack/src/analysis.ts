import type {
  ResourcePackAnimationController,
  ResourcePackAnimationDefinition,
} from "./types.js";

export interface AnimationControllerAssessment {
  controllerId: string;
  initialState: string;
  initialStateExists: boolean;
  transitionTargetsMissing: string[];
  referencedAnimations: string[];
  missingAnimations: string[];
  molangExpressions: string[];
  formatVersion?: string;
}

export function assessAnimationControllers(
  controllers: readonly ResourcePackAnimationController[],
  animations: readonly ResourcePackAnimationDefinition[],
): AnimationControllerAssessment[] {
  const animationIds = new Set(animations.map((animation) => animation.id));

  return controllers.map((controller) => {
    const stateIds = new Set(controller.states.map((state) => state.id));
    const transitionTargetsMissing = [...new Set(
      controller.states.flatMap((state) =>
        state.transitions
          .map((transition) => transition.targetState)
          .filter((target) => !stateIds.has(target))
      ),
    )].sort();
    const referencedAnimations = [...new Set(
      controller.states.flatMap((state) => state.animations),
    )].sort();
    const missingAnimations = referencedAnimations
      .filter((id) => !animationIds.has(id));

    return {
      controllerId: controller.id,
      initialState: controller.initialState,
      initialStateExists: stateIds.has(controller.initialState),
      transitionTargetsMissing,
      referencedAnimations,
      missingAnimations,
      molangExpressions: [...controller.molangExpressions],
      ...(controller.formatVersion
        ? { formatVersion: controller.formatVersion }
        : {}),
    };
  });
}
