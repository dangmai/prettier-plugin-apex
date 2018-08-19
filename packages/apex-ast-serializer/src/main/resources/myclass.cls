/*
 * Hello!
 */
public class MyClass implements FirstSampleInterface, SecondSampleInterface {
	public String sayHello() {
		// Comment to say Hello!
		return this.sayHello('Hello', 'World');  // Finish the line
	}

	public String sayHello(String subject) {
		return sayHello('Hello', subject);
	}

	public String sayHelloWithDate() {
		MyClass that = new MyClass();
		DateTime rightNow = that.getNow(), tomorrow, yesterday = DateTime.now().addDays(-1);
		return 'Hello at ' + now.format();
	}

	private sayHello(String action, String subject) {
		return action + ' ' + subject;
	}

	void doNothing() {
		return;
	}

	private DateTime getNow() {
		return DateTime.now();
	}
}