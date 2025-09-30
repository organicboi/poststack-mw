import { supabaseService } from '../src/services/supabase.service';
import { authService } from '../src/auth/enhanced-auth.service';
import { ErrorLogger } from '../src/utils/error-handler';

/**
 * Phase 1 Testing Script
 * Tests the core foundation components
 */

async function testPhase1() {
  console.log('🧪 Starting Phase 1 Tests');
  console.log('========================');

  const results = {
    supabaseConnection: false,
    authServiceHealth: false,
    errorHandling: false,
    typeDefinitions: false,
  };

  // Test 1: Supabase Connection
  try {
    console.log('1️⃣ Testing Supabase connection...');
    const healthCheck = await supabaseService.healthCheck();
    results.supabaseConnection = healthCheck.status === 'healthy';
    console.log(`   ✅ Supabase: ${healthCheck.status}`);
  } catch (error) {
    console.log(`   ❌ Supabase connection failed:`, error);
  }

  // Test 2: Auth Service Health
  try {
    console.log('2️⃣ Testing Auth Service...');
    const authHealth = await authService.healthCheck();
    results.authServiceHealth = authHealth.status === 'healthy';
    console.log(`   ✅ Auth Service: ${authHealth.status}`);
    console.log(`   📊 Checks:`, authHealth.checks);
  } catch (error) {
    console.log(`   ❌ Auth service health check failed:`, error);
  }

  // Test 3: Error Handling System
  try {
    console.log('3️⃣ Testing Error Handling...');

    // Test error logging
    ErrorLogger.log(new Error('Test error'));

    // Test error creation and handling
    const testError = new Error('Test validation error');
    ErrorLogger.log(testError);

    results.errorHandling = true;
    console.log('   ✅ Error handling system working');
  } catch (error) {
    console.log(`   ❌ Error handling test failed:`, error);
  }

  // Test 4: Type Definitions (compilation test)
  try {
    console.log('4️⃣ Testing Type Definitions...');

    // Import and test type definitions
    const { PlanTier, PLAN_LIMITS } = await import(
      '../src/types/enhanced.types'
    );

    // Verify plan limits structure
    const freePlan = PLAN_LIMITS['FREE' as PlanTier];
    if (freePlan && freePlan.posts_per_month === 10) {
      results.typeDefinitions = true;
      console.log('   ✅ Type definitions loaded correctly');
    } else {
      console.log('   ❌ Type definitions structure incorrect');
    }
  } catch (error) {
    console.log(`   ❌ Type definitions test failed:`, error);
  }

  // Summary
  console.log('\n📊 Phase 1 Test Results:');
  console.log('========================');

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${test}`);
  });

  const totalPassed = Object.values(results).filter(Boolean).length;
  const totalTests = Object.keys(results).length;

  console.log(`\n🎯 Summary: ${totalPassed}/${totalTests} tests passed`);

  if (totalPassed === totalTests) {
    console.log('🎉 Phase 1 implementation is ready!');
  } else {
    console.log(
      '⚠️  Some tests failed. Check your configuration and try again.'
    );
    console.log('\n🔧 Common fixes:');
    console.log('- Ensure .env file is properly configured');
    console.log('- Verify Supabase connection and credentials');
    console.log('- Check that database schema migration was run');
    console.log('- Make sure all dependencies are installed');
  }

  return results;
}

// Run tests if this file is executed directly
if (require.main === module) {
  testPhase1()
    .then(results => {
      const allPassed = Object.values(results).every(Boolean);
      process.exit(allPassed ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testPhase1 };
