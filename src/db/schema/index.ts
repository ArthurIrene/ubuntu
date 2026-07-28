// The whole schema, in one import.
//
// Drizzle's migration generator and its query builder both want every table in
// one object, so this file re-exports the lot. Read the individual files for
// the reasoning; nothing is declared here.
//
// The reasoning behind any single column lives in `docs/ubuntu-decisions.md`,
// by round. Where a comment in these files cites *(R7)* or *(R13a)*, that is
// the round to read.

export * from "./enums";
export * from "./admin";
export * from "./catalogue";
export * from "./customers";
export * from "./orders";
export * from "./fit";
export * from "./settings";
