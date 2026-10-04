Feature: Rules help tips
  As a game master who doesn't have every Mausritter rule memorised
  I want to tap a small "?" next to rules-heavy fields
  So that I can check what a stat means without leaving the form or opening the rulebook

  Background:
    Given I open Whiskerwatch
    And I navigate to the "Warband" screen

  Scenario: Checking what Pips are while editing a mouse
    Given the GM opens "Pip" to edit
    When the GM taps the help for "Pips"
    Then the GM should see a help tip mentioning "currency"
    When the GM presses Escape
    Then no help tip should be showing
    And the edit form should still be open

  Scenario: A help tip stays fully on screen at phone width
    Given the GM is using a phone-sized screen
    And the GM opens "Pip" to edit
    When the GM taps the help for "HP"
    Then the GM should see a help tip mentioning "Hit Protection"
    And the help tip should fit within the screen
