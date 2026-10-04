Feature: Reaction rolls
  As a game master running Mausritter
  I want a quick 2d6 reaction roll for an encountered creature
  So that I can improvise NPC attitudes at the table

  Background:
    Given I open Whiskerwatch

  Scenario: Rolling a reaction for a freshly-rolled encounter in Generators
    When I navigate to the "Generators" screen
    And the GM rolls an encounter
    And the GM rolls a reaction for the encounter
    Then I should see a reaction result showing a band and its guidance sentence

  Scenario: Rolling a new encounter clears the previous reaction result
    When I navigate to the "Generators" screen
    And the GM rolls an encounter
    And the GM rolls a reaction for the encounter
    And the GM rolls an encounter
    Then the "Roll Reaction" button should be visible again with no reaction result showing

