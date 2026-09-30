// The site's shell instance, wired to the real content.
import { site } from "@/config/site";
import { ui } from "@/config/ui";
import { projects, projectCategories } from "@/data/projects";
import { experienceEntries } from "@/data/experience";
import { about, homeContent, whoamiFacts, coreTechStack } from "@/data/home";
import { buildSkills } from "@/lib/skills";
import { createShell } from "./exec";

export const skills = buildSkills(coreTechStack, projects, ui.barStyle);

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
