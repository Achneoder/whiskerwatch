Feature: Global quick-find
  As a game master mid-prep or mid-table
  I want to search across the whole campaign from anywhere in the app
  So that I can jump straight to a mouse, beat, hex, or session without knowing which screen it lives on

  Background:
    Given I open Whiskerwatch

  Scenario: Searching for a hex by name surfaces it under Hexes and opens its detail on tap
    When the GM opens quick-find
    And the GM searches for "gnaw"
    Then the GM should see "The Gnawgate" under the "Hexes" quick-find category
    When the GM selects "The Gnawgate" from the quick-find results
    Then I should see the "Hex map" screen
    And I should see "The Gnawgate" in the hex detail

  Scenario: An empty query shows jump-to shortcuts instead of a blank sheet
    When the GM opens quick-find
    Then the GM should see the quick-find jump-to shortcuts
    When the GM jumps to "Bestiary" from quick-find
    Then I should see the "Bestiary" screen

  Scenario: A query that matches nothing shows the zero-result state
    When the GM opens quick-find
    And the GM searches for "ratlign"
    Then I should see "No matches"
