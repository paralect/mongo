/**
 * SERVER-7282 Faulty logic when testing maximum collection name length.
 * @tags: [requires_non_retryable_commands, assumes_unsharded_collection]
 */

(function() {
'use strict';

// constants from server
const maxNsLength = 127;
const maxNsCollectionLength = 120;

const myDb = db.getSiblingDB("ns_length");
myDb.dropDatabase();  // start empty

function mkStr(length) {
    let s = "";
    while (s.length < length) {
        s += "x";
    }
    return s;
}

function canMakeCollectionWithName(name) {
    assert.eq(myDb.stats().storageSize, 0, "initial conditions");

    let success = false;
    try {
        // may either throw or return an error
        success = !(myDb[name].insert({}).hasWriteError());
    } catch (e) {
        success = false;
    }

    if (!success) {
        assert.eq(myDb.stats().storageSize, 0, "no files should be created on error");
        return false;
    }

    myDb.dropDatabase();
    return true;
}

function canMakeIndexWithName(collection, name) {
    var success = collection.ensureIndex({x: 1}, {name: name}).ok;
    if (success) {
        assert.commandWorked(collection.dropIndex(name));
    }
    return success;
}

function canRenameCollection(from, to) {
    var success = myDb[from].renameCollection(to).ok;
    if (success) {
        // put it back
        assert.commandWorked(myDb[to].renameCollection(from));
    }
    return success;
}

// test making collections around the name limit
const prefixOverhead = (myDb.getName() + ".").length;
const maxCollectionNameLength = maxNsCollectionLength - prefixOverhead;
for (let i = maxCollectionNameLength - 3; i <= maxCollectionNameLength + 3; i++) {
    assert.eq(canMakeCollectionWithName(mkStr(i)),
              i <= maxCollectionNameLength,
              "ns name length = " + (prefixOverhead + i));
}

// test making indexes around the name limit
const collection = myDb.collection;
collection.insert({});
const maxIndexNameLength = maxNsLength - (collection.getFullName() + ".$").length;
for (let i = maxIndexNameLength - 3; i <= maxIndexNameLength + 3; i++) {
    assert(canMakeIndexWithName(collection, mkStr(i)),
           "index ns name length = " + ((collection.getFullName() + ".$").length + i));
}

// test renaming collections with the destination around the name limit
myDb.from.insert({});
for (let i = maxCollectionNameLength - 3; i <= maxCollectionNameLength + 3; i++) {
    assert.eq(canRenameCollection("from", mkStr(i)),
              i <= maxCollectionNameLength,
              "new ns name length = " + (prefixOverhead + i));
}

// test renaming collections with the destination around the name limit due to long indexe names
myDb.from.ensureIndex({a: 1}, {name: mkStr(100)});
const indexNsNameOverhead =
    (myDb.getName() + "..$").length + 100;  // index ns name - collection name
var maxCollectionNameWithIndex = maxNsLength - indexNsNameOverhead;
for (let i = maxCollectionNameWithIndex - 3; i <= maxCollectionNameWithIndex + 3; i++) {
    assert(canRenameCollection("from", mkStr(i)),
           "index ns name length = " + (indexNsNameOverhead + i));
}
})();
