window.addEventListener('load', function() {

	let selectors = document.getElementsByClassName('review_select');

	console.log(selectors);

	for (let i = 0; i < selectors.length; i++) {

		let num = selectors[i].id;	// Get number given by the id of the selector

		selectors[i].addEventListener("change", function() {

			let button = document.querySelector(`#button_${num}`);	// Find the button that corresponds with the selector ID

			if (this.value == 0) button.setAttribute('disabled', 'disabled');	// Enable or disable based on selector value
			else button.removeAttribute('disabled');
		});
	}
});