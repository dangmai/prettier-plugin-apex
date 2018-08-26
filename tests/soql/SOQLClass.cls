class SOQLClass {
  public void simpleSOQL() {
    Id[] contactIds = new Id[]{};
    Contact[] contacts = [
      SELECT Id, Name, AccountNumber, Site, AccountSource, AnnualRevenue, PersonAssistantName, BillingAddress, Account.Id, Account.CreatedById
      FROM Contact WHERE Id IN :contactIds ORDER BY Name DESC LIMIT 1 OFFSET 5
    ];
    Contact[] logicalOperators = [
      SELECT Id
      From Contact
      WHERE (Name = 'Hi' OR Name = 'Hello')
      AND NAME != 'World'
      AND (NOT(Name = 'Oops' OR Name = 'Another'))
      ORDER BY Name NULLS LAST
    ];
    Account[] comparisonOperators = [
      SELECT
        Id
      FROM Account
      WHERE (Name = 'Hi'
      OR Name != 'Hello'
      OR Name LIKE '%Hi%'
      OR Name IN ('Test', 'World')
      OR NAME NOT IN ('Tada', 'No')
      OR MultiPicklist__c INCLUDES ('AAA;BBB', 'CCC')
      OR MultiPicklist__c EXCLUDES ('DDD', 'EEE;FFF'))
      AND (Employees < 100
      OR Employees > 101
      OR Employees >= 200
      OR Employees <= 120)
    ];

    Integer i = [SELECT Count() FROM Contact];
    Contact[] subquery = [SELECT Id, (SELECT Id FROM Contacts LIMIT 5 OFFSET 5) sampleAlias FROM Account ORDER BY Name DESC LIMIT 1];
    Contact[] nestedFrom = [SELECT Id FROM Contact WHERE Id IN (SELECT Id FROM Contact) AND Account.Id <> NULL];

  }

  void escapeSoql() {
    Contact[] reservedKeywords = [
      SELECT Id
      FROM Contact
      WHERE Name = '\'Test Name\''
      OR Name = '\\Hi'
      OR Name = 'Hello\nWorld'
      OR Name = 'Hello\tWorld'
      OR Name = 'Hello\R\NWorld'
      OR Name = '\n\n\nHi'
    ];
  }

  void dateSoql() {
    AggregateResult[] literals = [
      SELECT Id
      FROM Contact
      WHERE CreatedDate > 2018-01-01T00:00:00Z
      OR CreatedDate < 2017-01-01T05:00:00+01:00
      OR CreatedDate < 2016-01-01T01:00:00-02:00
      GROUP BY CALENDAR_YEAR(CreatedDate)
    ];
    Contact[] contacts = [SELECT Id FROM Contact WHERE CreatedDate < 2018-01-01 OR CreatedDate > TOMORROW OR CreatedDate = LAST_N_DAYS:365];
  }

  void groupSoql() {
    AggregateResult[] currencies = [SELECT Name, MAX(Amount) FROM Opportunity GROUP BY Name HAVING MAX(Amount) > USD10000];
    AggregateResult[] groupedResults = [select avg(amount) aver from opportunity];
    AggregateResult[] anotherGroupedResults = [
      SELECT CampaignId, AVG(Amount)
      FROM Opportunity
      GROUP BY CampaignId];
  }

  void orderSoql() {
    Contact[] withoutExplicitOrderAndNullOrder = [SELECT Id FROM Contact ORDER BY Name];
    Contact[] withoutExplicitNullOrder = [SELECT Id FROM Contact ORDER BY NAME ASC];
    Contact[] withoutExplicitOrder = [SELECT Id FROM Contact ORDER BY Name NULLS LAST];
    Contact[] fullOrder = [SELECT Id FROM Contact ORDER BY Name ASC NULLS FIRST];
  }

  void nicheSoql() {
    Contact[] forView = [SELECT Name, ID FROM Contact  LIMIT 1 FOR VIEW];
    Contact[] forReference = [SELECT Name, ID FROM Contact  LIMIT 1 FOR REFERENCE];
    Account [] forUpdate = [SELECT Id FROM Account LIMIT 2 FOR UPDATE];
    Account[] includeDeleted = [SELECT Id FROM Account ALL ROWS];
    Account[] forViewAllRows = [SELECT Id FROM Account FOR VIEW ALL ROWS];
    FAQ__kav[] updateTrackings = [
      SELECT Title FROM FAQ__kav
      WHERE Keyword='Apex' and
      Language = 'en_US' and
      KnowledgeArticleVersion = 'ka230000000PCiy'
      UPDATE TRACKING];
    FAQ__kav[] updateViewStats = [
      SELECT Title FROM FAQ__kav
      WHERE PublishStatus='online' and
      Language = 'en_US' and
      KnowledgeArticleVersion = 'ka230000000PCiy'
      UPDATE VIEWSTAT
    ];
    FAQ__kav[] updateViewStatsAllRows = [
      SELECT Title FROM FAQ__kav
      WHERE PublishStatus='online' and
      Language = 'en_US' and
      KnowledgeArticleVersion = 'ka230000000PCiy'
      UPDATE VIEWSTAT
      ALL ROWS
    ];

    Contact[] usingScope = [SELECT Id FROM Contact USING SCOPE Mine];
    Event[] typeOf = [
      SELECT
        TYPEOF What
          WHEN Account THEN Phone, NumberOfEmployees
          WHEN Opportunity THEN Amount, CloseDate
          ELSE Name, Email
        END
      FROM Event];
    Offer__DataCategorySelection dataCategory = [SELECT Id,ParentId FROM Offer__DataCategorySelection];
    Warehouse__c[] geoLocations = [
      SELECT Name, StreetAddress__c
      FROM Warehouse__c
      WHERE DISTANCE(Location__c, GEOLOCATION(37.775,-122.418), 'mi') < 20
      ORDER BY DISTANCE(Location__c, GEOLOCATION(37.775,-122.418), 'mi')
      LIMIT 10
    ];
    UserProfileFeed[] withUserIds = [SELECT Id FROM UserProfileFeed WITH UserId='005D0000001AamR' ORDER BY CreatedDate DESC, Id DESC LIMIT 20];
    Question[] withSingleDataCategories = [SELECT Title FROM Question WHERE LastReplyDate > 2005-10-08T01:02:03Z WITH DATA CATEGORY Geography__c AT (usa__c, uk__c)];
    Question[] withMultipleDataCategories = [
      SELECT Title
      FROM Question
      WHERE LastReplyDate > 2005-10-08T01:02:03Z
      WITH DATA CATEGORY Geography__c AT (usa__c, uk__c) AND Product__c ABOVE_OR_BELOW usa__c
    ];
  }
}

