Feature: Campaign timeline view
  As a game master
  I want a chronological feed of sessions, completed beats, and faction clock changes
  So that I can answer questions like "when did the Owl Bridge toll go up?" without digging through every screen

  Background:
    Given I open Whiskerwatch

  Scenario: Completing a beat and bumping a faction clock both show up on the Timeline
    When I navigate to the "Adventure" screen
    And the GM adds an active beat titled "Find the tunnel entrance" to "The granary raid"
    And the GM completes the "Find the tunnel entrance" beat
    And I start a live session
    And the GM bumps "The Gnawing Court"'s faction clock
    And the GM exits the live session
    And I navigate to the "Timeline" screen
    Then I should see "Beat completed: Find the tunnel entrance" in the timeline
    And I should see "The Gnawing Court clock: 3 — 4" in the timeline
