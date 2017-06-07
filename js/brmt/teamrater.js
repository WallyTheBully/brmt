(function(){

window.project = window.project || {};
window.brmt = project.brmt = project.brmt || {};
let teamrater = brmt.teamrater = {};

let countTargetSpecies = teamrater.countTargetSpecies = function countTargetSpecies (build, subject, mode) {
	return Object.keys( build[subject.species][subject.set][mode] ).length;
};

let countTargetSets = teamrater.countTargetSets = function countTargetSets (build, subject, mode) {
	let sum = 0;
	let targets = build[subject.species][subject.set][mode];
	for (let targetSpecies in targets)
		sum += Object.keys(targets[targetSpecies]).length;
	return sum;
};

let countTeamChecks = teamrater.countTeamChecks = function countTeamChecks (build, subject, mode, team) {
	let sum = 0;
	let targets = build[subject.species][subject.set][mode];
	for (let pokemon of team) {
		if (targets[pokemon.species] && targets[pokemon.species][pokemon.set])
			sum++;
	}
	return sum;
};

teamrater.scoreSet = function scoreSet (build, subject, team, evaluator) {
// returns the weighted sum over an evaluator, for the given set
	if (subject.set === "species")
		return teamrater.scoreSpecies(build, subject, team, evaluator);
	let sum = 0;
	if (["GSI","SSI","NSI"].every( mode => countTargetSpecies(build, subject, mode) === 0 ))
		sum = 500000;
	for (let m = 0; m < brmt.config.siModes.length; m++)
		sum += brmt.config.weights[m] * evaluator(build, subject, brmt.config.siModes[m], team);
	return sum;
};

teamrater.scoreSpecies = function scoreSpecies (build, subject, team, evaluator) {
	// the score of a species is that of its most threatening set
	return Math.min( ...Object.keys(build[subject.species] ).map(
		set => teamrater.scoreSet( build, brmt.tools.makePokemonObject(subject.species, set), team, evaluator )
	));
};

teamrater.getThreatlist = function getThreatlist (build, team, type) {
	// make an array with the species ID and set ID of every threat
	let threats = [];
	for (let species in build) {
		if (type === "species")
			threats.push( brmt.tools.makePokemonObject(species, "species") );
		else {
			for (let set in build[species])
				threats.push( brmt.tools.makePokemonObject(species, set) );
		}
	}
	
	// attach scores to every one of these {species, set} combinations
	for (let threat of threats) {
		threat.score = {};
		// use countTargetSpecies over countTargetSets to avoid overrespresenting checks that have many sets..
		// .. going by set usage would be even better
		threat.score.species  = teamrater.scoreSpecies(build, threat, team, countTargetSpecies);
		threat.score.set      = teamrater.scoreSet    (build, threat, team, countTargetSpecies);
		threat.score.team     = teamrater.scoreSet    (build, threat, team, countTeamChecks   );
	}
	
	// sort the array based on the above scoring functions
	threats = threats.sort( (a,b) =>
		    ( a.score.team         - b.score.team         )  // sort by team specific set rating
		 || ( a.score.species      - b.score.species      )  // sort by species rating if tied
		 || ( a.species.hashCode() - b.species.hashCode() )  // group by species if still tied
		 || ( a.score.set          - b.score.set          )  // sort by set rating within that group
	);
	
	return threats;
};

})();