Feature: Live-combat HP tracker for rolled encounters
  As a game master running a fight at the table
  I want each creature in a rolled encounter to get its own trackable HP pool
  So that I always know who in a group is still standing, without falling
  back to paper the moment the fight starts

  Background:
    Given I open Whiskerwatch
    And I navigate to the "Hex map" screen
    And the GM opens the "Bramblewatch" hex
    # Phase 15: the encounter card is keyed off the party's actual position,
    # not just the active beat's linked hex — so the party needs to be
    # standing at Bramblewatch too, not merely have a beat pointing at it.
    And the GM places the party here
    And the GM links the "Gnawing Court Ratling" creature to this hex with weight 1
    And the GM saves the hex
    And I navigate to the "Adventure" screen
    And the GM starts a new beat titled "Clear the tunnels" under "The granary raid"
    And the GM sets the beat status to "Active"
    And the GM links the beat to the "Bramblewatch" hex
    And the GM saves the beat
    And I navigate to the "Overview" screen
    And I start a live session

  Scenario: Rolling an encounter, adding two more, and hurting one to 0 shows Defeated and Remove clears it
    When the GM rolls an encounter
    Then the GM should see the "Gnawing Court Ratling 1" instance
    When the GM adds another instance of the rolled creature
    And the GM adds another instance of the rolled creature
    Then the GM should see the "Gnawing Court Ratling 2" instance
    And the GM should see the "Gnawing Court Ratling 3" instance
    When the GM hurts the "Gnawing Court Ratling 1" instance for 4 damage
    Then the "Gnawing Court Ratling 1" instance should show as Defeated
    When the GM removes the defeated "Gnawing Court Ratling 1" instance
    Then the GM should not see the "Gnawing Court Ratling 1" instance

  Scenario: Removing a still-living instance is undoable
    When the GM rolls an encounter
    And the GM removes the "Gnawing Court Ratling 1" instance from the corner "x"
    Then the GM should not see the "Gnawing Court Ratling 1" instance
    When the GM undoes the encounter instance removal
    Then the GM should see the "Gnawing Court Ratling 1" instance

  Scenario: Rerolling the encounter clears every instance and starts numbering over
    When the GM rolls an encounter
    And the GM adds another instance of the rolled creature
    Then the GM should see the "Gnawing Court Ratling 2" instance
    When the GM rolls an encounter
    Then the GM should see the "Gnawing Court Ratling 1" instance
    And the GM should not see the "Gnawing Court Ratling 2" instance
