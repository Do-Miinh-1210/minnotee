// Casio Scientific Calculator Bridge for NoteRenderer 0.8.0 Native React Core
(function() {
    window.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C') && e.altKey) {
            e.preventDefault();
            if (typeof window.toggleCasioCalculator === 'function') {
                window.toggleCasioCalculator();
            }
        }
    });
})();
