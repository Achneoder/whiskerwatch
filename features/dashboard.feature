Feature: Session prep checklist
  As a game master about to sit down for a session
  I want a quick "before you sit down" checklist on the Dashboard
  So that I can see what's live right now — active beats, ready hexes, wages, and near-full clocks — without opening every screen

  Background:
    Given I open Whiskerwatch
    And I navigate to the "Adventure" screen
    And the GM adds an active beat titled "Find the tunnel entrance" to "The granary raid"
    And I navigate to the "Overview" screen

  Scenario: The Session Prep panel reflects real campaign state and jumps straight to the relevant screen
    Then I should see "Session Prep"
    And I should see "1 beats"
    And I should see "0 hexes"
    When the GM taps the "beats" row in Session Prep
    Then I should see "The granary raid"
