Feature: Settings
  As a game master
  I want a settings screen
  So that I can back up my campaign, and adjust theme and language, in one place

  Scenario: A new user is told their data lives only in this browser
    Given I open Whiskerwatch
    When I navigate to the "Settings" screen
    Then I should see "Your campaign lives only in this browser."
    And I should see "Campaign data"

  Scenario: Switching the language updates the whole interface
    Given I open Whiskerwatch
    When I navigate to the "Settings" screen
    And I switch the language to German
    Then I should see "Einstellungen"
    And I should see the "Übersicht" navigation entry

  Scenario: Switching the theme takes effect immediately
    Given I open Whiskerwatch
    When I navigate to the "Settings" screen
    And I switch the theme to dark
    Then the app uses the "dark" theme

  Scenario: Choosing a file that isn't a campaign export fails before anything is replaced
    Given I open Whiskerwatch
    When I navigate to the "Settings" screen
    And I choose an invalid file to import
    Then I should see "That file is not valid JSON."
    And I should not see "Replace campaign data?"

  Scenario: Moving a campaign from my phone to my tablet keeps the timeline
    Given I open Whiskerwatch
    And I start a live session
    And the GM bumps "The Gnawing Court"'s faction clock
    And the GM exits the live session
    When I navigate to the "Settings" screen
    And I export the campaign
    And I pick up my other device
    And I navigate to the "Settings" screen
    And I import the exported campaign
    Then the import preview shows 1 timeline entry
    When I confirm the import
    And I navigate to the "Timeline" screen
    Then I should see "The Gnawing Court clock: 3 — 4" in the timeline

  Scenario: A reset button is available to start over
    Given I open Whiskerwatch
    When I navigate to the "Settings" screen
    Then I should see "Reset everything"
    And I should see "Clear all campaign data and start fresh"

  Scenario: Party conditions on the overview follow the chosen language
    Given I open Whiskerwatch
    When I navigate to the "Settings" screen
    And I switch the language to German
    And I navigate to the "Übersicht" screen
    Then I should see "Verängstigt"
    And I should see "Hungrig & Durstig"

  Scenario: The demo campaign follows the chosen language
    Given I open Whiskerwatch
    When I navigate to the "Settings" screen
    And I switch the language to German
    And I navigate to the "Fraktionen" screen
    Then I should see "Der Nagehof"
    And I should see "Miliz von Brombeerwacht"

  Scenario: Generated NPCs follow the chosen language
    Given I open Whiskerwatch
    When I navigate to the "Settings" screen
    And I switch the language to German
    And I navigate to the "Generatoren" screen
    And the GM taps "NSC würfeln"
    Then I should see "Eigenheit:"
    And the rolled NPC is one of the German generator NPCs

  Scenario: The sample adventure follows the chosen language
    Given I open Whiskerwatch
    When I navigate to the "Settings" screen
    And I switch the language to German
    And I navigate to the "Abenteuer" screen
    Then I should see "Der Überfall auf den Kornspeicher"
    And I should not see "The granary raid"

  Scenario: Resetting the campaign also removes the sample adventure
    Given I open Whiskerwatch
    When I navigate to the "Settings" screen
    And I reset all campaign data
    And I navigate to the "Adventure" screen
    Then I should not see "The granary raid"

  Scenario: Bringing the sample campaign back after a reset
    Given I open Whiskerwatch
    When I navigate to the "Settings" screen
    And I reset all campaign data
    And I navigate to the "Settings" screen
    And I restore the sample campaign
    And I navigate to the "Adventure" screen
    Then I should see "The granary raid"
    When I navigate to the "Factions" screen
    Then I should see "The Gnawing Court"

  Scenario: The restored sample campaign is in the chosen language
    Given I open Whiskerwatch
    When I navigate to the "Settings" screen
    And I switch the language to German
    And I restore the sample campaign
    And I navigate to the "Abenteuer" screen
    Then I should see "Der Überfall auf den Kornspeicher"
