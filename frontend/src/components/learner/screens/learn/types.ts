export interface Concept {
  concept_id: string;
  name: string;
}

export type TeachingEntry = {
  id: string;
  who: "ovael" | "learner";
  text: string;
};

export type SocraticAction = "example" | "slow_down" | "practice";
