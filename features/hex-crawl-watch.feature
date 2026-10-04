Feature: Hex-crawl watches, travel, and party position
  As a game master running a hex-crawl at the table
  I want to advance the watch, travel to an adjacent hex, and forage — all in one tap
  So that I can track the party's day/watch/position without ever leaving Live Session

  Background:
    Given I open Whiskerwatch
    And the GM has forced every roll to fail
    And I navigate to the "Adventure" screen
    And the GM starts a new beat titled "Into the hedgerows" under "The granary raid"
    And the GM sets the beat status to "Active"
    And the GM saves the beat
    And I navigate to the "Hex map" screen
    And the GM opens the "Sunwarp Meadow" hex
    And the GM places the party here
    And the GM closes the hex detail
    And I navigate to the "Overview" screen
    And I start a live session

  Scenario: Staying put on the watch that starts Evening rolls the encounter check
    Given the GM has tapped "Stay put" 6 times
    Then I should see "Day 2 · Watch 3 (Evening)"
    When the GM taps "Stay put"
    Then I should see "Day 2 · Watch 4 (Night)"
    And the GM should see a rolled encounter check

  Scenario: Moving to an adjacent hex advances the watch and updates where the party stands
    When the GM taps "C3·Settlement"
    Then I should see "Standing in: Bramblewatch (Settlement)"

  Scenario: Foraging rolls rations and hands them to a chosen mouse's bag
    When the GM taps "Forage"
    Then the GM should see the rations roll and a recipient row
    When the GM adds the foraged rations to "Pip"
    Then "Pip" should have "Rations" in their bag
