// The site's shell instance, wired to the real content.
import { site } from "@/config/site";
import { projects, projectCategories } from "@/data/projects";
import { experienceEntries } from "@/data/experience";
import { about, homeContent, whoamiFacts, coreTechStack, courses } from "@/data/home";
import { buildItems, buildSkills } from "@/lib/skills";
import { createShell } from "./exec";

const skillSources = { projects, jobs: experienceEntries, courses };
export const skills = buildSkills(coreTechStack, skillSources);
/** How many things the skills bars are a share of (the legend says so). */
export const skillTotal = buildItems(skillSources).length;

export const shell = createShell({
  projects,
  categories: projectCategories,
  experience: experienceEntries,
  skills,
  site,
  about,
  intro: homeContent.intro,
  whoamiFacts,
});

export { pstr } from "./fs";
