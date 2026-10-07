import type { SetupAction } from "../contracts.js";

export type SetupOwner = "APP" | "USER" | "CLIENTS" | "BLOCKED";

export interface SetupExperience {
  owner: SetupOwner;
  phase: "COMPUTER" | "ENVIRONMENT" | "CLIENTS" | "ACCOUNTS" | "READY";
  title: string;
  description: string;
  primaryLabel: string;
  steps: readonly string[];
}

const flows: Record<SetupAction, SetupExperience> = {
  RUNTIME_DATA_INCOMPATIBLE: {
    owner: "BLOCKED",
    phase: "COMPUTER",
    title: "App data needs repair",
    description: "The stored Virtual Clients data is not compatible with this version. Do not continue setup until the data is repaired.",
    primaryLabel: "Open Help & Support",
    steps: ["Keep the current data unchanged.", "Open Help & Support for the exact diagnostic state."],
  },
  INSTALL_PROVIDER: {
    owner: "USER",
    phase: "COMPUTER",
    title: "Install virtualization",
    description: "VMware Workstation is required before Virtual Clients can create or run virtual Minecraft clients.",
    primaryLabel: "I've installed it",
    steps: ["Install VMware Workstation.", "Open VMware once if Windows asks for first-run setup.", "Return here and continue."],
  },
  INSTALL_NATIVE_MINECRAFT: {
    owner: "USER",
    phase: "COMPUTER",
    title: "Install Minecraft Education",
    description: "Minecraft Education on this PC is the version reference for every virtual client.",
    primaryLabel: "I've installed it",
    steps: ["Install Minecraft Education on this PC.", "Launch it once if the installer requires first-run completion.", "Return here and continue."],
  },
  PREPARE_BASE: {
    owner: "USER",
    phase: "ENVIRONMENT",
    title: "Prepare the virtual environment",
    description: "Prepare the reusable Windows environment used to create your virtual clients. Virtual Clients will verify it before anything is created.",
    primaryLabel: "Environment prepared",
    steps: [
      "Create the prepared Windows environment at the location shown below and install VMware Tools.",
      "Open Setup tools and follow the included preparation step using the official Minecraft Education installer.",
      "Do not sign in to Microsoft or Minecraft accounts in the prepared environment.",
      "Shut it down completely, then return here and continue.",
    ],
  },
  REGISTER_BASE: {
    owner: "APP",
    phase: "ENVIRONMENT",
    title: "Check the virtual environment",
    description: "Virtual Clients will check the prepared environment, confirm Minecraft compatibility, and stop it safely when finished.",
    primaryLabel: "Check environment",
    steps: [],
  },
  FINALIZE_BASE: {
    owner: "USER",
    phase: "ENVIRONMENT",
    title: "Finish the virtual environment",
    description: "One final Windows preparation step is required before Virtual Clients can create your clients.",
    primaryLabel: "Finalization completed",
    steps: [
      "Choose Open environment for final setup. Virtual Clients will open the prepared Windows environment.",
      "Inside Windows, open the installed Virtual Clients finalization tool as Administrator and confirm the one-time preparation.",
      "Wait for Windows to finish and shut down automatically.",
      "Return here after it shuts down. Do not start the prepared environment manually afterward.",
    ],
  },
  REBUILD_BASE: {
    owner: "USER",
    phase: "ENVIRONMENT",
    title: "Rebuild the virtual environment",
    description: "The prepared environment is interrupted or no longer matches Minecraft Education on this PC. Reusing it would be unsafe.",
    primaryLabel: "Environment rebuilt",
    steps: [
      "Replace the existing prepared environment with a clean one for the current Minecraft Education version.",
      "Repeat environment preparation and finalization.",
      "Return here after the new Base is fully stopped.",
    ],
  },
  PROVISION_VIRTUALS: {
    owner: "APP",
    phase: "CLIENTS",
    title: "Create virtual clients",
    description: "Virtual Clients will create Virtual 1, Virtual 2, and Virtual 3 from the finalized environment.",
    primaryLabel: "Create virtual clients",
    steps: [],
  },
  REPROVISION_VIRTUALS: {
    owner: "CLIENTS",
    phase: "CLIENTS",
    title: "Recreate outdated clients",
    description: "One or more virtual clients no longer match the current environment. Recreate only the affected clients.",
    primaryLabel: "Review clients",
    steps: [],
  },
  VERIFY_IDENTITIES: {
    owner: "CLIENTS",
    phase: "CLIENTS",
    title: "Complete first boot",
    description: "Each virtual client must finish Windows first boot before Virtual Clients can confirm that all client identities are unique.",
    primaryLabel: "Open clients",
    steps: [
      "Use Start first-time setup on each virtual client; its client window opens for Windows setup.",
      "Complete Windows first-run setup in each client if Windows asks.",
      "Inside each client, double-click Enable Virtual Clients Launcher on the Windows desktop once.",
      "Keep all three clients running together, then use Check clients after Windows setup completes.",
    ],
  },
  CREATE_READY_SNAPSHOTS: {
    owner: "CLIENTS",
    phase: "ACCOUNTS",
    title: "Set up accounts",
    description: "Sign in once on each virtual client, then save its recovery point. Account sessions remain inside each virtual machine.",
    primaryLabel: "Open clients",
    steps: [
      "Open one virtual client and sign in to its Windows user.",
      "Inside that Virtual, double-click Enable Virtual Clients Launcher on the Windows desktop once.",
      "Confirm Virtual Clients reports the interactive launcher as active.",
      "Open Minecraft Education, complete Microsoft sign-in in that same virtual Windows session, and confirm the main menu appears.",
      "Stop that client and choose Save recovery point.",
      "Repeat for the remaining clients.",
    ],
  },
  READY: {
    owner: "APP",
    phase: "READY",
    title: "Setup complete",
    description: "Setup is complete. Normal use starts from Clients.",
    primaryLabel: "Open clients",
    steps: [],
  },
};

export function setupExperience(action: SetupAction): SetupExperience {
  return flows[action];
}

export function setupPhaseIndex(action: SetupAction): number {
  const phase = setupExperience(action).phase;
  return phase === "COMPUTER" ? 0 : phase === "ENVIRONMENT" ? 1 : phase === "CLIENTS" ? 2 : 3;
}
