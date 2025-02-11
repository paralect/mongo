'use strict';

/**
 * Creates multiple unique background indexes in parallel with unique index upgrade collMods, on
 * capped collections.
 *
 * @tags: [creates_background_indexes, requires_capped]
 */

load('jstests/concurrency/fsm_libs/extend_workload.js');  // for extendWorkload
load('jstests/concurrency/fsm_workloads/create_index_background_unique_collmod.js');  // for $config

var $config = extendWorkload($config, function($config, $super) {
    $config.data.prefix = "create_index_background_unique_collmod_capped_";
    $config.data.getCollectionOptions = function() {
        // We create an 8MB capped collection, as it will comfortably fit the collection data
        // inserted by this test.
        const ONE_MB = 1024 * 1024;
        return {capped: true, size: 8 * ONE_MB};
    };

    return $config;
});
