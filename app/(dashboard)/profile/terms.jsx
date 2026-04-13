import React from "react"
import { StyleSheet, Linking } from "react-native"
import { WebView } from 'react-native-webview'
import ThemedView from "../../../components/ThemedView"

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Terms and Conditions</title>
<style>
  body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
  background-color: #F8F9FB;
  padding: 12px;
  margin-top: 78px;
}

.container {
  background: white;
  border-radius: 20px;
  padding: 22px;
  box-shadow: 0px 6px 20px rgba(0,0,0,0.06);
}

h1 {
  font-size: 26px;
  font-weight: 700;
  margin-bottom: 6px;
}

.subtitle {
  color: #888;
  font-size: 14px;
  margin-bottom: 18px;
}

h2 {
  font-size: 18px;
  margin-top: 26px;
  margin-bottom: 12px;
  padding: 12px;
  background: #EEF2FF;
  border-radius: 12px;
}

h3 {
  font-size: 17px;
  margin-top: 16px;
  font-weight: 600;
}

p, li {
  font-size: 14px;
  color: #555;
  line-height: 1.7;
}

ul, ol {
  padding-left: 20px;
}
.index ol {
  padding-left: 45px;  
}

.index h3{
  margin-left: 15px;
}

a {
  color: "#4A90E2"; 
  text-decoration: none;
  font-weight: 500;
}

.index {
  background: #F1F5FF;
  padding: 8px 12px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.index a {
  display: inline-block;
  padding: 4px 0;
}


.highlight {
  background: #EEF2FF;
  padding: 12px;
  border-radius: 12px;
  margin: 12px 0;
}
</style>
</head>
<body>

<body>
  <div class="container">
    <h1>Terms & Conditions</h1>
    <div class="subtitle">Last updated February 28, 2026</div>
<p>These terms and conditions (“Agreement”) set forth the general terms and conditions of your use of the “Reserve” mobile application (“Mobile Application” or “Service”) and any of its related products and services (collectively, “Services”). This Agreement is legally binding between you (“User”, “you” or “your”) and this Mobile Application developer (“Operator”, “we”, “us” or “our”). If you are entering into this Agreement on behalf of a business or other legal entity, you represent that you have the authority to bind such entity to this Agreement, in which case the terms “User”, “you” or “your” shall refer to such entity. If you do not have such authority, or if you do not agree with the terms of this Agreement, you must not accept this Agreement and may not access and use the Mobile Application and Services. By accessing and using the Mobile Application and Services, you acknowledge that you have read, understood, and agree to be bound by the terms of this Agreement. You acknowledge that this Agreement is a contract between you and the Operator, even though it is electronic and is not physically signed by you, and it governs your use of the Mobile Application and Services.</p>

<div class="index">
<h3>Table of contents</h3>
<ol class="index">
  <li><a href="#accounts-and-membership">Accounts and membership</a></li>
  <li><a href="#links-to-other-resources">Links to other resources</a></li>
  <li><a href="#prohibited-uses">Prohibited uses</a></li>
  <li><a href="#intellectual-property-rights">Intellectual property rights</a></li>
  <li><a href="#indemnification">Indemnification</a></li>
  <li><a href="#severability">Severability</a></li>
  <li><a href="#dispute-resolution">Dispute resolution</a></li>
  <li><a href="#changes-and-amendments">Changes and amendments</a></li>
  <li><a href="#acceptance-of-these-terms">Acceptance of these terms</a></li>
  <li><a href="#contacting-us">Contacting us</a></li>
</ol>
</div>

<h2 id="accounts-and-membership">Accounts and membership</h2>
<p>You must be at least 18 years of age to use the Mobile Application and Services. By using the Mobile Application and Services and by agreeing to this Agreement you warrant and represent that you are at least 18 years of age. If you create an account in the Mobile Application, you are responsible for maintaining the security of your account and you are fully responsible for all activities that occur under the account and any other actions taken in connection with it. We may monitor and review new accounts before you may sign in and start using the Services. Providing false contact information of any kind may result in the termination of your account. You must immediately notify us of any unauthorized uses of your account or any other breaches of security. We will not be liable for any acts or omissions by you, including any damages of any kind incurred as a result of such acts or omissions. We may suspend, disable, or delete your account (or any part thereof) if we determine that you have violated any provision of this Agreement or that your conduct or content would tend to damage our reputation and goodwill. If we delete your account for the foregoing reasons, you may not re-register for our Services. We may block your email address and Internet protocol address to prevent further registration.</p>

<h2 id="links-to-other-resources">Links to other resources</h2>
<p>Although the Mobile Application and Services may link to other resources (such as websites, mobile applications, etc.), we are not, directly or indirectly, implying any approval, association, sponsorship, endorsement, or affiliation with any linked resource, unless specifically stated herein. We are not responsible for examining or evaluating, and we do not warrant the offerings of, any businesses or individuals or the content of their resources. We do not assume any responsibility or liability for the actions, products, services, and content of any other third parties. You should carefully review the legal statements and other conditions of use of any resource which you access through a link in the Mobile Application. Your linking to any other off-site resources is at your own risk.</p>

<h2 id="prohibited-uses">Prohibited uses</h2>
<p>In addition to other terms as set forth in the Agreement, you are prohibited from using the Mobile Application and Services or Content: (a) for any unlawful purpose; (b) to solicit others to perform or participate in any unlawful acts; (c) to violate any international, federal, provincial or state regulations, rules, laws, or local ordinances; (d) to infringe upon or violate our intellectual property rights or the intellectual property rights of others; (e) to harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate based on gender, sexual orientation, religion, ethnicity, race, age, national origin, or disability; (f) to submit false or misleading information; (g) to upload or transmit viruses or any other type of malicious code that will or may be used in any way that will affect the functionality or operation of the Mobile Application and Services, third party products and services, or the Internet; (h) to spam, phish, pharm, pretext, spider, crawl, or scrape; (i) for any obscene or immoral purpose; or (j) to interfere with or circumvent the security features of the Mobile Application and Services, third party products and services, or the Internet. We reserve the right to terminate your use of the Mobile Application and Services for violating any of the prohibited uses.</p>

<h2 id="intellectual-property-rights">Intellectual property rights</h2>
<p>“Intellectual Property Rights” means all present and future rights conferred by statute, common law or equity in or in relation to any copyright and related rights, trademarks, designs, patents, inventions, goodwill and the right to sue for passing off, rights to inventions, rights to use, and all other intellectual property rights, in each case whether registered or unregistered and including all applications and rights to apply for and be granted, rights to claim priority from, such rights and all similar or equivalent rights or forms of protection and any other results of intellectual activity which subsist or will subsist now or in the future in any part of the world. This Agreement does not transfer to you any intellectual property owned by the Operator or third parties, and all rights, titles, and interests in and to such property will remain (as between the parties) solely with the Operator. All trademarks, service marks, graphics and logos used in connection with the Mobile Application and Services, are trademarks or registered trademarks of the Operator or its licensors. Other trademarks, service marks, graphics and logos used in connection with the Mobile Application and Services may be the trademarks of other third parties. Your use of the Mobile Application and Services grants you no right or license to reproduce or otherwise use any of the Operator or third party trademarks.</p>

<h2 id="indemnification">Indemnification</h2>
<p>You agree to indemnify and hold the Operator and its affiliates, directors, officers, employees, agents, suppliers and licensors harmless from and against any liabilities, losses, damages or costs, including reasonable attorneys’ fees, incurred in connection with or arising from any third party allegations, claims, actions, disputes, or demands asserted against any of them as a result of or relating to your Content, your use of the Mobile Application and Services or any willful misconduct on your part.</p>

<h2 id="severability">Severability</h2>
<p>All rights and restrictions contained in this Agreement may be exercised and shall be applicable and binding only to the extent that they do not violate any applicable laws and are intended to be limited to the extent necessary so that they will not render this Agreement illegal, invalid or unenforceable. If any provision or portion of any provision of this Agreement shall be held to be illegal, invalid or unenforceable by a court of competent jurisdiction, it is the intention of the parties that the remaining provisions or portions thereof shall constitute their agreement with respect to the subject matter hereof, and all such remaining provisions or portions thereof shall remain in full force and effect.</p>

<h2 id="dispute-resolution">Dispute resolution</h2>
<p>The formation, interpretation, and performance of this Agreement and any disputes arising out of it shall be governed by the substantive and procedural laws of Texas, United States without regard to its rules on conflicts or choice of law and, to the extent applicable, the laws of United States. The exclusive jurisdiction and venue for actions related to the subject matter hereof shall be the courts located in Texas, United States, and you hereby submit to the personal jurisdiction of such courts. You hereby waive any right to a jury trial in any proceeding arising out of or related to this Agreement. The United Nations Convention on Contracts for the International Sale of Goods does not apply to this Agreement.</p>

<h2 id="changes-and-amendments">Changes and amendments</h2>
<p>We reserve the right to modify this Agreement or its terms related to the Mobile Application and Services at any time at our discretion. When we do, we will revise the updated date at the bottom of this page, send you an email to notify you. We may also provide notice to you in other ways at our discretion, such as through the contact information you have provided.</p>
<p>An updated version of this Agreement will be effective immediately upon the posting of the revised Agreement unless otherwise specified. Your continued use of the Mobile Application and Services after the effective date of the revised Agreement (or such other act specified at that time) will constitute your consent to those changes.</p>

<h2 id="acceptance-of-these-terms">Acceptance of these terms</h2>
<p>You acknowledge that you have read this Agreement and agree to all its terms and conditions. By accessing and using the Mobile Application and Services you agree to be bound by this Agreement. If you do not agree to abide by the terms of this Agreement, you are not authorized to access or use the Mobile Application and Services.</p>

<h2 id="contacting-us">Contacting us</h2>
<p>If you have any questions, concerns, or complaints regarding this Agreement, we encourage you to contact us using the details below:</p>
<p><a href="mailto:reservesupplyapp@gmail.com">reservesupplyapp@gmail.com</a></p>


<p></p>

</body>
</html>
`

const Terms = () => {
  return (
    <ThemedView style={styles.container}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: htmlContent }}
        onShouldStartLoadWithRequest={(request) => {
          if (request.url.startsWith("http")) {
            Linking.openURL(request.url)
            return false
          }
          return true
        }}
      />
    </ThemedView>
  )
}

export default Terms

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})